import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hashFingerprint, hashIP, hashUserAgent } from '@/lib/hash';
import { verifyCaptcha } from '@/lib/captcha';
import type { 
  VoteSubmissionData, 
  VoteServiceResult, 
  MatchValidationResult, 
  FraudDetectionResult,
  VoteResponse 
} from '@/types/api';

/**
 * Main vote submission logic
 */
export async function submitVote(data: VoteSubmissionData, clientIP: string): Promise<VoteServiceResult<VoteResponse>> {
  const startTime = Date.now();
  const fingerprintHash = hashFingerprint(data.fingerprint);
  const ipHash = hashIP(clientIP);
  const userAgentHash = hashUserAgent(data.userAgent);

  logger.info('Vote submission started', {
    matchId: data.matchId,
    teamChoice: data.teamChoice,
    fingerprintHash: fingerprintHash.substring(0, 8) + '...',
    ipHash: ipHash.substring(0, 8) + '...',
    h3Index: data.location.h3Index,
    h3Resolution: data.location.h3Resolution
  });

  try {
    // 1. Validate match
    const matchValidation = await validateMatch(data.matchId);
    if (!matchValidation.isValid || !matchValidation.match) {
      logger.warn('Match validation failed', { 
        matchId: data.matchId, 
        error: matchValidation.error 
      });
      return {
        success: false,
        error: matchValidation.error || 'Invalid match',
        code: 'INVALID_MATCH'
      };
    }

    const match = matchValidation.match;

    // 2. Verify captcha if required
    if (match.requireCaptcha) {
      if (!data.captchaToken) {
        logger.warn('Captcha required but not provided', { matchId: data.matchId });
        return {
          success: false,
          error: 'Captcha verification required',
          code: 'CAPTCHA_REQUIRED'
        };
      }

      const captchaValid = await verifyCaptcha(data.captchaToken, clientIP);
      if (!captchaValid) {
        logger.warn('Captcha verification failed', { 
          matchId: data.matchId,
          fingerprintHash: fingerprintHash.substring(0, 8) + '...'
        });
        return {
          success: false,
          error: 'Captcha verification failed',
          code: 'CAPTCHA_FAILED'
        };
      }
    }

    // 3. Check vote limit
    const voteLimitCheck = await checkVoteLimit(fingerprintHash, data.matchId, match.maxVotesPerUser);
    if (!voteLimitCheck.success) {
      logger.warn('Vote limit exceeded', {
        matchId: data.matchId,
        fingerprintHash: fingerprintHash.substring(0, 8) + '...',
        maxVotes: match.maxVotesPerUser
      });
      return voteLimitCheck;
    }

    // 4. Fraud detection
    const fraudResult = await detectFraud({
      ...data,
      fingerprintHash,
      ipHash,
      userAgentHash
    });

    if (fraudResult.isSuspicious) {
      await logFraudEvent({
        matchId: data.matchId,
        fingerprintHash,
        ipHash,
        reasons: fraudResult.reasons,
        severity: fraudResult.severity,
        metadata: {
          h3Index: data.location.h3Index,
          userAgent: data.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      if (fraudResult.severity === 'critical' || fraudResult.severity === 'high') {
        logger.warn('Vote blocked due to fraud detection', {
          matchId: data.matchId,
          severity: fraudResult.severity,
          reasons: fraudResult.reasons
        });
        return {
          success: false,
          error: 'Vote submission blocked',
          code: 'FRAUD_DETECTED'
        };
      }
    }

    // 5. Submit vote with transaction
    const voteResult = await submitVoteTransaction({
      matchId: data.matchId,
      teamChoice: data.teamChoice,
      fingerprintHash,
      ipHash,
      userAgentHash,
      h3Index: data.location.h3Index,
      h3Resolution: data.location.h3Resolution,
      countryCode: data.location.countryCode,
      cityName: data.location.cityName,
      locationSource: data.location.source,
      consentPreciseGeo: data.location.consentPreciseGeo
    });

    if (!voteResult.success) {
      return voteResult;
    }

    const duration = Date.now() - startTime;
    logger.info('Vote submission completed', {
      matchId: data.matchId,
      voteId: voteResult.data?.voteId,
      duration: `${duration}ms`,
      fraudDetected: fraudResult.isSuspicious
    });

    return voteResult;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Vote submission failed', {
      matchId: data.matchId,
      error,
      duration: `${duration}ms`
    });
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Validate match status and configuration
 */
export async function validateMatch(matchId: string): Promise<MatchValidationResult> {
  try {
    const { data: match, error } = await supabase
      .from('matches')
      .select('id, status, require_captcha, max_votes_per_user, start_time, end_time')
      .eq('id', matchId)
      .single();

    if (error || !match) {
      logger.warn('Match not found', { matchId, error });
      return {
        isValid: false,
        error: 'Match not found'
      };
    }

    if (match.status !== 'active') {
      logger.warn('Match not active', { matchId, status: match.status });
      return {
        isValid: false,
        error: 'Match is not active'
      };
    }

    const now = new Date();
    const startTime = new Date(match.start_time);
    const endTime = new Date(match.end_time);

    if (now < startTime || now > endTime) {
      logger.warn('Match outside time window', { 
        matchId, 
        now: now.toISOString(),
        startTime: match.start_time,
        endTime: match.end_time
      });
      return {
        isValid: false,
        error: 'Match is not currently accepting votes'
      };
    }

    return {
      isValid: true,
      match: {
        id: match.id,
        status: match.status,
        requireCaptcha: match.require_captcha,
        maxVotesPerUser: match.max_votes_per_user
      }
    };

  } catch (error) {
    logger.error('Match validation error', { matchId, error });
    return {
      isValid: false,
      error: 'Failed to validate match'
    };
  }
}

/**
 * Check if user has exceeded vote limit
 */
export async function checkVoteLimit(
  fingerprintHash: string, 
  matchId: string, 
  maxVotes: number
): Promise<VoteServiceResult> {
  try {
    const { count, error } = await supabase
      .from('votes_raw')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint_hash', fingerprintHash)
      .eq('match_id', matchId)
      .eq('deleted', false);

    if (error) {
      logger.error('Vote limit check failed', { fingerprintHash: fingerprintHash.substring(0, 8) + '...', matchId, error });
      return {
        success: false,
        error: 'Failed to check vote limit',
        code: 'VOTE_LIMIT_CHECK_FAILED'
      };
    }

    if ((count || 0) >= maxVotes) {
      return {
        success: false,
        error: `Maximum ${maxVotes} vote(s) per user exceeded`,
        code: 'VOTE_LIMIT_EXCEEDED'
      };
    }

    return { success: true };

  } catch (error) {
    logger.error('Vote limit check error', { fingerprintHash: fingerprintHash.substring(0, 8) + '...', matchId, error });
    return {
      success: false,
      error: 'Failed to check vote limit',
      code: 'VOTE_LIMIT_CHECK_FAILED'
    };
  }
}

/**
 * Basic fraud detection
 */
export async function detectFraud(data: {
  matchId: string;
  fingerprintHash: string;
  ipHash: string;
  userAgentHash: string;
  location: {
    h3Index: string;
    h3Resolution: number;
  };
}): Promise<FraudDetectionResult> {
  const reasons: string[] = [];
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  try {
    // Check for multiple IPs with same fingerprint
    const { count: ipCount } = await supabase
      .from('votes_raw')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint_hash', data.fingerprintHash)
      .eq('match_id', data.matchId)
      .neq('ip_hash', data.ipHash)
      .eq('deleted', false);

    if ((ipCount || 0) > 0) {
      reasons.push('Multiple IP addresses for same fingerprint');
      severity = 'medium';
    }

    // Check for multiple fingerprints with same IP
    const { count: fpCount } = await supabase
      .from('votes_raw')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', data.ipHash)
      .eq('match_id', data.matchId)
      .neq('fingerprint_hash', data.fingerprintHash)
      .eq('deleted', false);

    if ((fpCount || 0) > 2) {
      reasons.push('Multiple fingerprints from same IP');
      severity = 'high';
    }

    // Check for rapid voting patterns (same fingerprint, multiple votes in short time)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('votes_raw')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint_hash', data.fingerprintHash)
      .gte('voted_at', fiveMinutesAgo)
      .eq('deleted', false);

    if ((recentCount || 0) > 3) {
      reasons.push('Rapid voting pattern detected');
      severity = 'critical';
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
      severity
    };

  } catch (error) {
    logger.error('Fraud detection error', { matchId: data.matchId, error });
    return {
      isSuspicious: false,
      reasons: [],
      severity: 'low'
    };
  }
}

/**
 * Log fraud event
 */
export async function logFraudEvent(data: {
  matchId: string;
  fingerprintHash: string;
  ipHash: string;
  reasons: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('fraud_events')
      .insert({
        match_id: data.matchId,
        fingerprint_hash: data.fingerprintHash,
        ip_hash: data.ipHash,
        detection_reason: data.reasons.join('; '),
        severity: data.severity,
        metadata: data.metadata
      });

    if (error) {
      logger.error('Failed to log fraud event', { matchId: data.matchId, error });
    } else {
      logger.warn('Fraud event logged', {
        matchId: data.matchId,
        severity: data.severity,
        reasons: data.reasons
      });
    }
  } catch (error) {
    logger.error('Fraud event logging error', { matchId: data.matchId, error });
  }
}

/**
 * Submit vote with atomic transaction
 */
async function submitVoteTransaction(voteData: {
  matchId: string;
  teamChoice: 'team_a' | 'team_b';
  fingerprintHash: string;
  ipHash: string;
  userAgentHash: string;
  h3Index: string;
  h3Resolution: number;
  countryCode?: string;
  cityName?: string;
  locationSource: 'ip' | 'browser_geo' | 'manual';
  consentPreciseGeo: boolean;
}): Promise<VoteServiceResult<VoteResponse>> {
  try {
    // Start transaction by inserting vote
    const { data: vote, error: voteError } = await supabase
      .from('votes_raw')
      .insert({
        match_id: voteData.matchId,
        team_choice: voteData.teamChoice,
        fingerprint_hash: voteData.fingerprintHash,
        ip_hash: voteData.ipHash,
        user_agent_hash: voteData.userAgentHash,
        h3_index: voteData.h3Index,
        h3_resolution: voteData.h3Resolution,
        country_code: voteData.countryCode,
        city_name: voteData.cityName,
        location_source: voteData.locationSource,
        consent_precise_geo: voteData.consentPreciseGeo
      })
      .select('id')
      .single();

    if (voteError || !vote) {
      logger.error('Failed to insert vote', { matchId: voteData.matchId, error: voteError });
      return {
        success: false,
        error: 'Failed to record vote',
        code: 'VOTE_INSERT_FAILED'
      };
    }

    // Update H3 aggregation
    const { error: h3Error } = await supabase.rpc('upsert_vote_agg_h3', {
      p_match_id: voteData.matchId,
      p_h3_index: voteData.h3Index,
      p_h3_resolution: voteData.h3Resolution,
      p_team_choice: voteData.teamChoice
    });

    if (h3Error) {
      logger.error('Failed to update H3 aggregation', { matchId: voteData.matchId, error: h3Error });
      // Don't fail the vote, but log the error
    }

    // Update country aggregation if country code is available
    if (voteData.countryCode) {
      const { error: countryError } = await supabase.rpc('upsert_vote_agg_country', {
        p_match_id: voteData.matchId,
        p_country_code: voteData.countryCode,
        p_team_choice: voteData.teamChoice
      });

      if (countryError) {
        logger.error('Failed to update country aggregation', { matchId: voteData.matchId, error: countryError });
        // Don't fail the vote, but log the error
      }
    }

    // Get current stats
    const { data: stats } = await supabase
      .from('vote_agg_h3')
      .select('team_a_count, team_b_count')
      .eq('match_id', voteData.matchId)
      .eq('h3_index', voteData.h3Index)
      .eq('h3_resolution', voteData.h3Resolution)
      .single();

    const currentStats = {
      teamACount: stats?.team_a_count || 0,
      teamBCount: stats?.team_b_count || 0,
      totalVotes: (stats?.team_a_count || 0) + (stats?.team_b_count || 0)
    };

    return {
      success: true,
      data: {
        success: true,
        voteId: vote.id,
        currentStats
      }
    };

  } catch (error) {
    logger.error('Vote transaction failed', { matchId: voteData.matchId, error });
    return {
      success: false,
      error: 'Failed to process vote',
      code: 'TRANSACTION_FAILED'
    };
  }
}
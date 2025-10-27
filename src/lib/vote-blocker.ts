import { logger } from './logger';
import { supabase } from './db';
import type { FraudEventData } from '@/services/fraud-logger';
import { calculateFraudScore, getBlockReason } from './fraud-utils';

/**
 * Determine if a vote should be blocked based on fraud score
 * Block if score > 10
 */
export function shouldBlockVote(fraudScore: number): boolean {
  const shouldBlock = fraudScore > 10;

  logger.debug('Vote blocking decision', {
    fraudScore,
    shouldBlock,
    threshold: 10
  });

  return shouldBlock;
}

/**
 * Get human-readable block reason from fraud events
 */
export function getVoteBlockReason(events: FraudEventData[]): string {
  return getBlockReason(events);
}

/**
 * Log blocked vote attempt to database
 * We'll store this in the fraud_events table with a special marker
 */
export async function logBlockedVote(
  data: {
    matchId: string;
    fingerprintHash: string;
    ipHash: string;
    teamChoice: 'team_a' | 'team_b';
    reason: string;
    fraudEvents: FraudEventData[];
  }
): Promise<void> {
  try {
    const fraudScore = calculateFraudScore(data.fraudEvents);

    // Log the blocked vote as a fraud event
    const { error } = await supabase
      .from('fraud_events')
      .insert({
        match_id: data.matchId,
        vote_id: null, // No vote was created
        fingerprint_hash: data.fingerprintHash,
        ip_hash: data.ipHash,
        detection_reason: `Vote blocked: ${data.reason}`,
        severity: 'critical',
        metadata: {
          action: 'vote_blocked',
          teamChoice: data.teamChoice,
          fraudScore,
          fraudEvents: data.fraudEvents.map(e => ({
            eventType: e.eventType,
            severity: e.severity,
            reason: e.reason
          }))
        }
      });

    if (error) {
      logger.error('Failed to log blocked vote', {
        matchId: data.matchId,
        error
      });
    } else {
      logger.warn('Blocked vote logged', {
        matchId: data.matchId,
        fingerprintHash: data.fingerprintHash.substring(0, 8) + '...',
        ipHash: data.ipHash.substring(0, 8) + '...',
        reason: data.reason,
        fraudScore
      });
    }
  } catch (error) {
    logger.error('Failed to log blocked vote', {
      matchId: data.matchId,
      error
    });
  }
}

/**
 * Check if vote should be allowed based on fraud detection results
 */
export function evaluateVoteEligibility(
  events: FraudEventData[]
): {
  allowed: boolean;
  shouldReview: boolean;
  reason?: string;
  score: number;
} {
  const score = calculateFraudScore(events);
  const blocked = shouldBlockVote(score);
  const shouldReview = score > 5 && score <= 10;

  if (blocked) {
    return {
      allowed: false,
      shouldReview: false,
      reason: getBlockReason(events),
      score
    };
  }

  return {
    allowed: true,
    shouldReview,
    score
  };
}

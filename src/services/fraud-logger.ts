import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FraudEventData {
  matchId: string;
  voteId?: string;
  fingerprintHash: string;
  ipHash: string;
  eventType: string;
  severity: FraudSeverity;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * Log a fraud event to the database
 */
export async function logFraudEvent(data: FraudEventData): Promise<void> {
  try {
    const { error } = await supabase
      .from('fraud_events')
      .insert({
        match_id: data.matchId,
        vote_id: data.voteId || null,
        fingerprint_hash: data.fingerprintHash,
        ip_hash: data.ipHash,
        detection_reason: data.reason,
        severity: data.severity,
        metadata: data.metadata || {}
      });

    if (error) {
      logger.error('Failed to log fraud event', {
        matchId: data.matchId,
        eventType: data.eventType,
        severity: data.severity,
        error
      });
      throw error;
    }

    logger.warn('Fraud event logged', {
      matchId: data.matchId,
      voteId: data.voteId,
      eventType: data.eventType,
      severity: data.severity,
      reason: data.reason,
      fingerprintHash: data.fingerprintHash.substring(0, 8) + '...',
      ipHash: data.ipHash.substring(0, 8) + '...'
    });
  } catch (error) {
    logger.error('Fraud event logging failed', {
      matchId: data.matchId,
      eventType: data.eventType,
      error
    });
    // Don't throw - logging failures shouldn't block the application
  }
}

/**
 * Log multiple fraud events in batch
 */
export async function logFraudEventsBatch(events: FraudEventData[]): Promise<void> {
  if (events.length === 0) return;

  try {
    const records = events.map(data => ({
      match_id: data.matchId,
      vote_id: data.voteId || null,
      fingerprint_hash: data.fingerprintHash,
      ip_hash: data.ipHash,
      detection_reason: data.reason,
      severity: data.severity,
      metadata: data.metadata || {}
    }));

    const { error } = await supabase
      .from('fraud_events')
      .insert(records);

    if (error) {
      logger.error('Failed to log fraud events batch', {
        count: events.length,
        error
      });
      throw error;
    }

    logger.warn('Fraud events batch logged', {
      count: events.length,
      severities: events.map(e => e.severity)
    });
  } catch (error) {
    logger.error('Fraud events batch logging failed', {
      count: events.length,
      error
    });
    // Don't throw - logging failures shouldn't block the application
  }
}

/**
 * Get fraud events for a match
 */
export async function getFraudEventsForMatch(
  matchId: string,
  options?: {
    severity?: FraudSeverity;
    reviewed?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> {
  try {
    let query = supabase
      .from('fraud_events')
      .select('*')
      .eq('match_id', matchId)
      .order('detected_at', { ascending: false });

    if (options?.severity) {
      query = query.eq('severity', options.severity);
    }

    if (options?.reviewed !== undefined) {
      query = query.eq('reviewed', options.reviewed);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get fraud events for match', {
        matchId,
        error
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Get fraud events failed', {
      matchId,
      error
    });
    return [];
  }
}

/**
 * Mark a fraud event as reviewed
 */
export async function markFraudEventReviewed(
  eventId: string,
  reviewedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fraud_events')
      .update({
        reviewed: true,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', eventId);

    if (error) {
      logger.error('Failed to mark fraud event as reviewed', {
        eventId,
        reviewedBy,
        error
      });
      return false;
    }

    logger.info('Fraud event marked as reviewed', {
      eventId,
      reviewedBy
    });

    return true;
  } catch (error) {
    logger.error('Mark fraud event reviewed failed', {
      eventId,
      error
    });
    return false;
  }
}

/**
 * Get fraud events for a fingerprint
 */
export async function getFraudEventsForFingerprint(
  fingerprintHash: string,
  matchId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('fraud_events')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .order('detected_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get fraud events for fingerprint', {
        fingerprintHash: fingerprintHash.substring(0, 8) + '...',
        matchId,
        error
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Get fraud events for fingerprint failed', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      error
    });
    return [];
  }
}

/**
 * Get fraud events for an IP
 */
export async function getFraudEventsForIP(
  ipHash: string,
  matchId?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('fraud_events')
      .select('*')
      .eq('ip_hash', ipHash)
      .order('detected_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get fraud events for IP', {
        ipHash: ipHash.substring(0, 8) + '...',
        matchId,
        error
      });
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Get fraud events for IP failed', {
      ipHash: ipHash.substring(0, 8) + '...',
      error
    });
    return [];
  }
}

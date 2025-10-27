import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { FraudSeverity } from './fraud-logger';

export interface FraudStats {
  totalEvents: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  reviewed: number;
  unreviewed: number;
  reviewProgress: number; // percentage
}

export interface FraudTrend {
  date: string;
  count: number;
  severity: FraudSeverity;
}

export interface TopOffender {
  hash: string;
  eventCount: number;
  highestSeverity: FraudSeverity;
  lastDetected: string;
}

/**
 * Get fraud statistics for a match
 */
export async function getFraudStats(matchId: string): Promise<FraudStats> {
  try {
    const { data, error } = await supabase
      .from('fraud_events')
      .select('severity, reviewed')
      .eq('match_id', matchId);

    if (error) {
      logger.error('Failed to get fraud stats', { matchId, error });
      throw error;
    }

    const stats: FraudStats = {
      totalEvents: data.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      reviewed: 0,
      unreviewed: 0,
      reviewProgress: 0
    };

    data.forEach(event => {
      stats.bySeverity[event.severity as FraudSeverity]++;
      if (event.reviewed) {
        stats.reviewed++;
      } else {
        stats.unreviewed++;
      }
    });

    if (stats.totalEvents > 0) {
      stats.reviewProgress = Math.round((stats.reviewed / stats.totalEvents) * 100);
    }

    logger.debug('Fraud stats calculated', {
      matchId,
      totalEvents: stats.totalEvents,
      reviewProgress: stats.reviewProgress
    });

    return stats;
  } catch (error) {
    logger.error('Get fraud stats failed', { matchId, error });
    return {
      totalEvents: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      reviewed: 0,
      unreviewed: 0,
      reviewProgress: 0
    };
  }
}

/**
 * Get fraud trends over time
 * Returns daily fraud event counts grouped by severity
 */
export async function getFraudTrends(
  matchId?: string,
  days: number = 7
): Promise<FraudTrend[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('fraud_events')
      .select('detected_at, severity')
      .gte('detected_at', startDate.toISOString())
      .order('detected_at', { ascending: true });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get fraud trends', { matchId, error });
      throw error;
    }

    // Group by date and severity
    const trendsMap = new Map<string, Map<FraudSeverity, number>>();

    data.forEach(event => {
      const dateParts = new Date(event.detected_at).toISOString().split('T');
      const date = dateParts[0] || '';
      const severity = event.severity as FraudSeverity;

      if (!trendsMap.has(date)) {
        trendsMap.set(date, new Map());
      }

      const dateMap = trendsMap.get(date)!;
      dateMap.set(severity, (dateMap.get(severity) || 0) + 1);
    });

    // Convert to array
    const trends: FraudTrend[] = [];
    trendsMap.forEach((severityMap, date) => {
      severityMap.forEach((count, severity) => {
        trends.push({ date, count, severity });
      });
    });

    logger.debug('Fraud trends calculated', {
      matchId,
      days,
      trendCount: trends.length
    });

    return trends;
  } catch (error) {
    logger.error('Get fraud trends failed', { matchId, error });
    return [];
  }
}

/**
 * Get most flagged IPs for a match
 */
export async function getMostFlaggedIPs(
  matchId: string,
  limit: number = 10
): Promise<TopOffender[]> {
  try {
    const { data, error } = await supabase
      .from('fraud_events')
      .select('ip_hash, severity, detected_at')
      .eq('match_id', matchId)
      .order('detected_at', { ascending: false });

    if (error) {
      logger.error('Failed to get most flagged IPs', { matchId, error });
      throw error;
    }

    // Group by IP hash
    const ipMap = new Map<string, {
      count: number;
      highestSeverity: FraudSeverity;
      lastDetected: string;
    }>();

    const severityOrder: FraudSeverity[] = ['low', 'medium', 'high', 'critical'];

    data.forEach(event => {
      const ip = event.ip_hash;
      if (!ip) return;

      const existing = ipMap.get(ip);
      if (!existing) {
        ipMap.set(ip, {
          count: 1,
          highestSeverity: event.severity as FraudSeverity,
          lastDetected: event.detected_at
        });
      } else {
        existing.count++;
        const currentSeverityIndex = severityOrder.indexOf(event.severity as FraudSeverity);
        const highestSeverityIndex = severityOrder.indexOf(existing.highestSeverity);
        if (currentSeverityIndex > highestSeverityIndex) {
          existing.highestSeverity = event.severity as FraudSeverity;
        }
        if (new Date(event.detected_at) > new Date(existing.lastDetected)) {
          existing.lastDetected = event.detected_at;
        }
      }
    });

    // Convert to array and sort by count
    const topOffenders: TopOffender[] = Array.from(ipMap.entries())
      .map(([hash, data]) => ({
        hash,
        eventCount: data.count,
        highestSeverity: data.highestSeverity,
        lastDetected: data.lastDetected
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, limit);

    logger.debug('Most flagged IPs retrieved', {
      matchId,
      count: topOffenders.length
    });

    return topOffenders;
  } catch (error) {
    logger.error('Get most flagged IPs failed', { matchId, error });
    return [];
  }
}

/**
 * Get most flagged fingerprints for a match
 */
export async function getMostFlaggedFingerprints(
  matchId: string,
  limit: number = 10
): Promise<TopOffender[]> {
  try {
    const { data, error } = await supabase
      .from('fraud_events')
      .select('fingerprint_hash, severity, detected_at')
      .eq('match_id', matchId)
      .order('detected_at', { ascending: false });

    if (error) {
      logger.error('Failed to get most flagged fingerprints', { matchId, error });
      throw error;
    }

    // Group by fingerprint hash
    const fpMap = new Map<string, {
      count: number;
      highestSeverity: FraudSeverity;
      lastDetected: string;
    }>();

    const severityOrder: FraudSeverity[] = ['low', 'medium', 'high', 'critical'];

    data.forEach(event => {
      const fp = event.fingerprint_hash;
      if (!fp) return;

      const existing = fpMap.get(fp);
      if (!existing) {
        fpMap.set(fp, {
          count: 1,
          highestSeverity: event.severity as FraudSeverity,
          lastDetected: event.detected_at
        });
      } else {
        existing.count++;
        const currentSeverityIndex = severityOrder.indexOf(event.severity as FraudSeverity);
        const highestSeverityIndex = severityOrder.indexOf(existing.highestSeverity);
        if (currentSeverityIndex > highestSeverityIndex) {
          existing.highestSeverity = event.severity as FraudSeverity;
        }
        if (new Date(event.detected_at) > new Date(existing.lastDetected)) {
          existing.lastDetected = event.detected_at;
        }
      }
    });

    // Convert to array and sort by count
    const topOffenders: TopOffender[] = Array.from(fpMap.entries())
      .map(([hash, data]) => ({
        hash,
        eventCount: data.count,
        highestSeverity: data.highestSeverity,
        lastDetected: data.lastDetected
      }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, limit);

    logger.debug('Most flagged fingerprints retrieved', {
      matchId,
      count: topOffenders.length
    });

    return topOffenders;
  } catch (error) {
    logger.error('Get most flagged fingerprints failed', { matchId, error });
    return [];
  }
}

/**
 * Get overall review progress across all matches
 */
export async function getReviewProgress(): Promise<{
  total: number;
  reviewed: number;
  unreviewed: number;
  percentage: number;
}> {
  try {
    const { data, error } = await supabase
      .from('fraud_events')
      .select('reviewed');

    if (error) {
      logger.error('Failed to get review progress', { error });
      throw error;
    }

    const total = data.length;
    const reviewed = data.filter(e => e.reviewed).length;
    const unreviewed = total - reviewed;
    const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    logger.debug('Review progress calculated', {
      total,
      reviewed,
      unreviewed,
      percentage
    });

    return {
      total,
      reviewed,
      unreviewed,
      percentage
    };
  } catch (error) {
    logger.error('Get review progress failed', { error });
    return {
      total: 0,
      reviewed: 0,
      unreviewed: 0,
      percentage: 0
    };
  }
}

/**
 * Get fraud event counts by type
 */
export async function getFraudEventsByType(
  matchId?: string
): Promise<Record<string, number>> {
  try {
    let query = supabase
      .from('fraud_events')
      .select('detection_reason');

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to get fraud events by type', { matchId, error });
      throw error;
    }

    const eventTypes: Record<string, number> = {};

    data.forEach(event => {
      const reason = event.detection_reason;
      eventTypes[reason] = (eventTypes[reason] || 0) + 1;
    });

    logger.debug('Fraud events by type calculated', {
      matchId,
      typeCount: Object.keys(eventTypes).length
    });

    return eventTypes;
  } catch (error) {
    logger.error('Get fraud events by type failed', { matchId, error });
    return {};
  }
}

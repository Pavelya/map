import { logger } from './logger';
import type { FraudSeverity, FraudEventData } from '@/services/fraud-logger';
import { getFraudEventsForFingerprint, getFraudEventsForIP } from '@/services/fraud-logger';

/**
 * Calculate fraud score from events
 * Scoring:
 * - low: 1 point
 * - medium: 3 points
 * - high: 5 points
 * - critical: 10 points
 */
export function calculateFraudScore(events: FraudEventData[]): number {
  const scoreMap: Record<FraudSeverity, number> = {
    low: 1,
    medium: 3,
    high: 5,
    critical: 10
  };

  const score = events.reduce((total, event) => {
    return total + scoreMap[event.severity];
  }, 0);

  logger.debug('Calculated fraud score', {
    eventsCount: events.length,
    score,
    severities: events.map(e => e.severity)
  });

  return score;
}

/**
 * Determine if a vote should be blocked based on fraud score
 * Block if score > 10
 */
export function shouldBlockVote(score: number): boolean {
  const shouldBlock = score > 10;

  logger.debug('Vote block decision', {
    score,
    shouldBlock,
    threshold: 10
  });

  return shouldBlock;
}

/**
 * Determine if a vote should be flagged for review
 * Flag for review if score > 5
 */
export function shouldReviewVote(score: number): boolean {
  const shouldReview = score > 5;

  logger.debug('Vote review decision', {
    score,
    shouldReview,
    threshold: 5
  });

  return shouldReview;
}

/**
 * Get a human-readable reason why a vote was blocked
 */
export function getBlockReason(events: FraudEventData[]): string {
  if (events.length === 0) {
    return 'Vote blocked due to security concerns';
  }

  // Group by severity
  const criticalEvents = events.filter(e => e.severity === 'critical');
  const highEvents = events.filter(e => e.severity === 'high');

  if (criticalEvents.length > 0) {
    const reasons = criticalEvents.map(e => e.reason).join(', ');
    return `Vote blocked: ${reasons}`;
  }

  if (highEvents.length > 0) {
    const reasons = highEvents.map(e => e.reason).join(', ');
    return `Vote blocked: ${reasons}`;
  }

  const score = calculateFraudScore(events);
  return `Vote blocked due to high fraud score (${score})`;
}

/**
 * Get fraud pattern analysis for a fingerprint in a match
 */
export async function getFraudPattern(
  fingerprintHash: string,
  matchId: string
): Promise<{
  totalEvents: number;
  severityCounts: Record<FraudSeverity, number>;
  eventTypes: string[];
  score: number;
  shouldBlock: boolean;
  shouldReview: boolean;
}> {
  try {
    const events = await getFraudEventsForFingerprint(fingerprintHash, matchId);

    const severityCounts: Record<FraudSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const eventTypesSet = new Set<string>();

    events.forEach(event => {
      severityCounts[event.severity as FraudSeverity]++;
      eventTypesSet.add(event.detection_reason);
    });

    // Convert database events to FraudEventData format for scoring
    const fraudEvents: FraudEventData[] = events.map(e => ({
      matchId: e.match_id,
      voteId: e.vote_id,
      fingerprintHash: e.fingerprint_hash,
      ipHash: e.ip_hash,
      eventType: e.detection_reason,
      severity: e.severity as FraudSeverity,
      reason: e.detection_reason,
      metadata: e.metadata
    }));

    const score = calculateFraudScore(fraudEvents);

    return {
      totalEvents: events.length,
      severityCounts,
      eventTypes: Array.from(eventTypesSet),
      score,
      shouldBlock: shouldBlockVote(score),
      shouldReview: shouldReviewVote(score)
    };
  } catch (error) {
    logger.error('Failed to get fraud pattern', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      error
    });

    return {
      totalEvents: 0,
      severityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
      eventTypes: [],
      score: 0,
      shouldBlock: false,
      shouldReview: false
    };
  }
}

/**
 * Get fraud pattern analysis for an IP in a match
 */
export async function getFraudPatternForIP(
  ipHash: string,
  matchId: string
): Promise<{
  totalEvents: number;
  severityCounts: Record<FraudSeverity, number>;
  eventTypes: string[];
  score: number;
}> {
  try {
    const events = await getFraudEventsForIP(ipHash, matchId);

    const severityCounts: Record<FraudSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    const eventTypesSet = new Set<string>();

    events.forEach(event => {
      severityCounts[event.severity as FraudSeverity]++;
      eventTypesSet.add(event.detection_reason);
    });

    // Convert database events to FraudEventData format for scoring
    const fraudEvents: FraudEventData[] = events.map(e => ({
      matchId: e.match_id,
      voteId: e.vote_id,
      fingerprintHash: e.fingerprint_hash,
      ipHash: e.ip_hash,
      eventType: e.detection_reason,
      severity: e.severity as FraudSeverity,
      reason: e.detection_reason,
      metadata: e.metadata
    }));

    const score = calculateFraudScore(fraudEvents);

    return {
      totalEvents: events.length,
      severityCounts,
      eventTypes: Array.from(eventTypesSet),
      score
    };
  } catch (error) {
    logger.error('Failed to get fraud pattern for IP', {
      ipHash: ipHash.substring(0, 8) + '...',
      matchId,
      error
    });

    return {
      totalEvents: 0,
      severityCounts: { low: 0, medium: 0, high: 0, critical: 0 },
      eventTypes: [],
      score: 0
    };
  }
}

/**
 * Check if a user agent is suspicious (bot, missing, etc.)
 */
export function isSuspiciousUserAgent(userAgent: string): {
  isSuspicious: boolean;
  reason?: string;
} {
  if (!userAgent || userAgent.trim().length === 0) {
    return {
      isSuspicious: true,
      reason: 'Missing user agent'
    };
  }

  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /java/i,
    /go-http-client/i,
    /axios/i,
    /node-fetch/i,
    /postman/i,
    /insomnia/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      return {
        isSuspicious: true,
        reason: `Bot user agent detected: ${userAgent.substring(0, 50)}`
      };
    }
  }

  return { isSuspicious: false };
}

/**
 * Calculate distance between two coordinates in kilometers
 * Using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if geo inconsistency is suspicious
 * Flag if locations are > 100km apart
 */
export function hasGeoInconsistency(
  ipLat: number,
  ipLon: number,
  browserLat: number,
  browserLon: number
): {
  hasInconsistency: boolean;
  distance?: number;
} {
  const distance = calculateDistance(ipLat, ipLon, browserLat, browserLon);

  return {
    hasInconsistency: distance > 100,
    distance
  };
}

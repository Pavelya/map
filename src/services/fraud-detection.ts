import { logger } from '@/lib/logger';
import {
  trackIPForFingerprint,
  trackFingerprintForIP,
  trackVoteTime,
  getUniqueIPCount,
  getUniqueFingerprintCount,
  getVoteTimestamps,
  trackCoordinates,
  getCoordinateCount
} from '@/lib/fraud-patterns';
import {
  isSuspiciousUserAgent,
  hasGeoInconsistency
} from '@/lib/fraud-utils';
import { logFraudEvent, type FraudEventData, type FraudSeverity } from './fraud-logger';

export interface FraudDetectionInput {
  matchId: string;
  fingerprintHash: string;
  ipHash: string;
  userAgent: string;
  location?: {
    latitude?: number;
    longitude?: number;
    ipLatitude?: number;
    ipLongitude?: number;
  };
}

export interface FraudDetectionOutput {
  isSuspicious: boolean;
  events: FraudEventData[];
  highestSeverity: FraudSeverity;
  shouldBlock: boolean;
}

/**
 * Main fraud detection orchestrator
 * Runs all detection methods and aggregates results
 */
export async function detectFraud(
  input: FraudDetectionInput
): Promise<FraudDetectionOutput> {
  const events: FraudEventData[] = [];

  try {
    logger.info('Starting fraud detection', {
      matchId: input.matchId,
      fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
      ipHash: input.ipHash.substring(0, 8) + '...'
    });

    // Track patterns in Redis first
    await Promise.all([
      trackIPForFingerprint(input.fingerprintHash, input.ipHash, input.matchId),
      trackFingerprintForIP(input.ipHash, input.fingerprintHash, input.matchId),
      trackVoteTime(input.fingerprintHash, input.matchId)
    ]);

    // Track coordinates if available
    if (input.location?.latitude && input.location?.longitude) {
      await trackCoordinates(input.matchId, input.location.latitude, input.location.longitude);
    }

    // Run all detection methods in parallel
    const detectionResults = await Promise.allSettled([
      detectMultipleIPsPerFingerprint(input),
      detectMultipleFingerprintsPerIP(input),
      detectRapidVoting(input),
      detectSuspiciousUserAgent(input),
      detectGeoInconsistency(input),
      detectCoordinateSpoofing(input)
    ]);

    // Collect all detected fraud events
    detectionResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        events.push(result.value);
      } else if (result.status === 'rejected') {
        logger.error(`Detection method ${index} failed`, { error: result.reason });
      }
    });

    // Log all fraud events to database
    if (events.length > 0) {
      await Promise.all(events.map(event => logFraudEvent(event)));
    }

    // Determine highest severity
    const severityOrder: FraudSeverity[] = ['low', 'medium', 'high', 'critical'];
    const highestSeverity = events.reduce((highest, event) => {
      const currentIndex = severityOrder.indexOf(event.severity);
      const highestIndex = severityOrder.indexOf(highest);
      return currentIndex > highestIndex ? event.severity : highest;
    }, 'low' as FraudSeverity);

    // Determine if vote should be blocked
    const shouldBlock = highestSeverity === 'critical' || highestSeverity === 'high';

    logger.info('Fraud detection completed', {
      matchId: input.matchId,
      eventsDetected: events.length,
      highestSeverity,
      shouldBlock,
      eventTypes: events.map(e => e.eventType)
    });

    return {
      isSuspicious: events.length > 0,
      events,
      highestSeverity,
      shouldBlock
    };

  } catch (error) {
    logger.error('Fraud detection failed', {
      matchId: input.matchId,
      error
    });

    // Return safe defaults on error
    return {
      isSuspicious: false,
      events: [],
      highestSeverity: 'low',
      shouldBlock: false
    };
  }
}

/**
 * Detection Method: Multiple IPs per Fingerprint
 * Track unique IPs per fingerprint per match
 * Flag if fingerprint used from >3 different IPs
 * Severity: medium
 */
export async function detectMultipleIPsPerFingerprint(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    const uniqueIPCount = await getUniqueIPCount(input.fingerprintHash, input.matchId);

    if (uniqueIPCount > 3) {
      logger.warn('Multiple IPs per fingerprint detected', {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
        uniqueIPCount
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'multiple_ips_per_fingerprint',
        severity: 'medium',
        reason: `Fingerprint used from ${uniqueIPCount} different IP addresses`,
        metadata: {
          uniqueIPCount,
          threshold: 3
        }
      };
    }

    return null;
  } catch (error) {
    logger.error('detectMultipleIPsPerFingerprint failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: Multiple Fingerprints per IP
 * Track unique fingerprints per IP per match
 * Flag if IP has >5 different fingerprints
 * Severity: high
 */
export async function detectMultipleFingerprintsPerIP(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    const uniqueFingerprintCount = await getUniqueFingerprintCount(input.ipHash, input.matchId);

    if (uniqueFingerprintCount > 5) {
      logger.warn('Multiple fingerprints per IP detected', {
        matchId: input.matchId,
        ipHash: input.ipHash.substring(0, 8) + '...',
        uniqueFingerprintCount
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'multiple_fingerprints_per_ip',
        severity: 'high',
        reason: `IP has ${uniqueFingerprintCount} different fingerprints`,
        metadata: {
          uniqueFingerprintCount,
          threshold: 5
        }
      };
    }

    return null;
  } catch (error) {
    logger.error('detectMultipleFingerprintsPerIP failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: Rapid Voting
 * Check time between votes from same fingerprint
 * Flag if <10 seconds between votes
 * Severity: low
 */
export async function detectRapidVoting(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    const timestamps = await getVoteTimestamps(input.fingerprintHash, input.matchId);

    // Need at least 2 votes to check intervals
    if (timestamps.length < 2) {
      return null;
    }

    // Check if any two consecutive votes are less than 10 seconds apart
    for (let i = 1; i < timestamps.length; i++) {
      const timeDiff = (timestamps[i]! - timestamps[i - 1]!) / 1000; // Convert to seconds

      if (timeDiff < 10) {
        logger.warn('Rapid voting detected', {
          matchId: input.matchId,
          fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
          timeDiff: `${timeDiff.toFixed(2)}s`,
          voteCount: timestamps.length
        });

        return {
          matchId: input.matchId,
          fingerprintHash: input.fingerprintHash,
          ipHash: input.ipHash,
          eventType: 'rapid_voting',
          severity: 'low',
          reason: `Votes submitted ${timeDiff.toFixed(2)} seconds apart`,
          metadata: {
            timeDiff,
            threshold: 10,
            voteCount: timestamps.length,
            timestamps
          }
        };
      }
    }

    return null;
  } catch (error) {
    logger.error('detectRapidVoting failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: Suspicious User Agent
 * Check for bot user agents, missing user agents
 * Flag known bot patterns
 * Severity: medium
 */
export async function detectSuspiciousUserAgent(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    const result = isSuspiciousUserAgent(input.userAgent);

    if (result.isSuspicious) {
      logger.warn('Suspicious user agent detected', {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
        reason: result.reason,
        userAgent: input.userAgent.substring(0, 100)
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'suspicious_user_agent',
        severity: 'medium',
        reason: result.reason || 'Suspicious user agent',
        metadata: {
          userAgent: input.userAgent.substring(0, 200)
        }
      };
    }

    return null;
  } catch (error) {
    logger.error('detectSuspiciousUserAgent failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: Geo Inconsistency
 * Compare IP geolocation with browser geolocation
 * Flag if >100km apart
 * Severity: medium
 */
export async function detectGeoInconsistency(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    // Check if we have both IP and browser geolocations
    if (
      !input.location?.ipLatitude ||
      !input.location?.ipLongitude ||
      !input.location?.latitude ||
      !input.location?.longitude
    ) {
      return null;
    }

    const result = hasGeoInconsistency(
      input.location.ipLatitude,
      input.location.ipLongitude,
      input.location.latitude,
      input.location.longitude
    );

    if (result.hasInconsistency && result.distance) {
      logger.warn('Geo inconsistency detected', {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
        distance: `${result.distance.toFixed(2)}km`
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'geo_inconsistency',
        severity: 'medium',
        reason: `IP and browser locations ${result.distance.toFixed(0)}km apart`,
        metadata: {
          distance: result.distance,
          threshold: 100,
          ipLocation: {
            latitude: input.location.ipLatitude,
            longitude: input.location.ipLongitude
          },
          browserLocation: {
            latitude: input.location.latitude,
            longitude: input.location.longitude
          }
        }
      };
    }

    return null;
  } catch (error) {
    logger.error('detectGeoInconsistency failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: Coordinate Spoofing
 * Check if coordinates are exactly same as other votes
 * Flag if >10 votes from exact same GPS coordinates
 * Severity: high
 */
export async function detectCoordinateSpoofing(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    if (!input.location?.latitude || !input.location?.longitude) {
      return null;
    }

    const count = await getCoordinateCount(
      input.matchId,
      input.location.latitude,
      input.location.longitude
    );

    if (count > 10) {
      logger.warn('Coordinate spoofing detected', {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash.substring(0, 8) + '...',
        coordinates: `${input.location.latitude},${input.location.longitude}`,
        count
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'coordinate_spoofing',
        severity: 'high',
        reason: `${count} votes from exact same GPS coordinates`,
        metadata: {
          count,
          threshold: 10,
          coordinates: {
            latitude: input.location.latitude,
            longitude: input.location.longitude
          }
        }
      };
    }

    return null;
  } catch (error) {
    logger.error('detectCoordinateSpoofing failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

/**
 * Detection Method: VPN or Proxy Detection
 * Check if IP is known VPN/proxy
 * Note: This is a placeholder - you would integrate with an IP intelligence API
 * Severity: high
 */
export async function detectVPNOrProxy(
  input: FraudDetectionInput
): Promise<FraudEventData | null> {
  try {
    // TODO: Integrate with IP intelligence service like:
    // - IPHub (https://iphub.info/)
    // - IPQualityScore (https://www.ipqualityscore.com/)
    // - ProxyCheck (https://proxycheck.io/)
    // - IPData (https://ipdata.co/)

    // Placeholder implementation
    // In production, make API call to IP intelligence service:
    // const isVPN = await checkIPIntelligence(input.ipHash);

    // For now, we'll skip this detection method
    // Uncomment when you integrate an IP intelligence service

    /*
    if (isVPN) {
      logger.warn('VPN or proxy detected', {
        matchId: input.matchId,
        ipHash: input.ipHash.substring(0, 8) + '...'
      });

      return {
        matchId: input.matchId,
        fingerprintHash: input.fingerprintHash,
        ipHash: input.ipHash,
        eventType: 'vpn_or_proxy',
        severity: 'high',
        reason: 'VPN or proxy IP detected',
        metadata: {
          ipIntelligence: 'VPN/Proxy detected'
        }
      };
    }
    */

    return null;
  } catch (error) {
    logger.error('detectVPNOrProxy failed', {
      matchId: input.matchId,
      error
    });
    return null;
  }
}

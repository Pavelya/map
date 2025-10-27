import { redis } from './redis';
import { logger } from './logger';

/**
 * Track IP address for a fingerprint in a match
 * Key: fraud:fp:ips:{fingerprintHash}:{matchId}
 * Value: Set of IP hashes
 */
export async function trackIPForFingerprint(
  fingerprintHash: string,
  ipHash: string,
  matchId: string
): Promise<number> {
  try {
    const key = `fraud:fp:ips:${fingerprintHash}:${matchId}`;

    // Add IP hash to set
    await redis.sadd(key, ipHash);

    // Set TTL to 2 days (match duration + 1 day buffer)
    await redis.expire(key, 60 * 60 * 24 * 2);

    // Get count of unique IPs
    const count = await redis.scard(key);

    logger.debug('Tracked IP for fingerprint', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      ipHash: ipHash.substring(0, 8) + '...',
      matchId,
      uniqueIPCount: count
    });

    return count;
  } catch (error) {
    logger.error('Failed to track IP for fingerprint', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return 0;
  }
}

/**
 * Track fingerprint for an IP address in a match
 * Key: fraud:ip:fps:{ipHash}:{matchId}
 * Value: Set of fingerprint hashes
 */
export async function trackFingerprintForIP(
  ipHash: string,
  fingerprintHash: string,
  matchId: string
): Promise<number> {
  try {
    const key = `fraud:ip:fps:${ipHash}:${matchId}`;

    // Add fingerprint hash to set
    await redis.sadd(key, fingerprintHash);

    // Set TTL to 2 days (match duration + 1 day buffer)
    await redis.expire(key, 60 * 60 * 24 * 2);

    // Get count of unique fingerprints
    const count = await redis.scard(key);

    logger.debug('Tracked fingerprint for IP', {
      ipHash: ipHash.substring(0, 8) + '...',
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      uniqueFingerprintCount: count
    });

    return count;
  } catch (error) {
    logger.error('Failed to track fingerprint for IP', {
      ipHash: ipHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return 0;
  }
}

/**
 * Track vote timestamp for a fingerprint in a match
 * Key: fraud:times:{fingerprintHash}:{matchId}
 * Value: List of timestamps
 */
export async function trackVoteTime(
  fingerprintHash: string,
  matchId: string
): Promise<number[]> {
  try {
    const key = `fraud:times:${fingerprintHash}:${matchId}`;
    const now = Date.now();

    // Add current timestamp to list
    await redis.rpush(key, now.toString());

    // Set TTL to 2 days
    await redis.expire(key, 60 * 60 * 24 * 2);

    // Get all timestamps
    const timestamps = await redis.lrange(key, 0, -1);
    const parsedTimestamps = timestamps.map(t => parseInt(t, 10));

    logger.debug('Tracked vote time', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      timestamp: now,
      totalVotes: parsedTimestamps.length
    });

    return parsedTimestamps;
  } catch (error) {
    logger.error('Failed to track vote time', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return [];
  }
}

/**
 * Get unique IP count for a fingerprint in a match
 */
export async function getUniqueIPCount(
  fingerprintHash: string,
  matchId: string
): Promise<number> {
  try {
    const key = `fraud:fp:ips:${fingerprintHash}:${matchId}`;
    const count = await redis.scard(key);
    return count;
  } catch (error) {
    logger.error('Failed to get unique IP count', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return 0;
  }
}

/**
 * Get unique fingerprint count for an IP in a match
 */
export async function getUniqueFingerprintCount(
  ipHash: string,
  matchId: string
): Promise<number> {
  try {
    const key = `fraud:ip:fps:${ipHash}:${matchId}`;
    const count = await redis.scard(key);
    return count;
  } catch (error) {
    logger.error('Failed to get unique fingerprint count', {
      ipHash: ipHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return 0;
  }
}

/**
 * Get all vote timestamps for a fingerprint in a match
 */
export async function getVoteTimestamps(
  fingerprintHash: string,
  matchId: string
): Promise<number[]> {
  try {
    const key = `fraud:times:${fingerprintHash}:${matchId}`;
    const timestamps = await redis.lrange(key, 0, -1);
    return timestamps.map(t => parseInt(t, 10));
  } catch (error) {
    logger.error('Failed to get vote timestamps', {
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
      matchId,
      error
    });
    return [];
  }
}

/**
 * Track exact GPS coordinates for a match
 * Key: fraud:coords:{matchId}
 * Value: Hash map of coordinates to count
 */
export async function trackCoordinates(
  matchId: string,
  latitude: number,
  longitude: number
): Promise<number> {
  try {
    const key = `fraud:coords:${matchId}`;
    const coordKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    // Increment count for these coordinates
    await redis.hincrby(key, coordKey, 1);

    // Set TTL to 2 days
    await redis.expire(key, 60 * 60 * 24 * 2);

    // Get count for these specific coordinates
    const count = await redis.hget(key, coordKey);
    const parsedCount = count ? parseInt(String(count), 10) : 0;

    logger.debug('Tracked coordinates', {
      matchId,
      coordinates: coordKey,
      count: parsedCount
    });

    return parsedCount;
  } catch (error) {
    logger.error('Failed to track coordinates', {
      matchId,
      error
    });
    return 0;
  }
}

/**
 * Get count for specific coordinates in a match
 */
export async function getCoordinateCount(
  matchId: string,
  latitude: number,
  longitude: number
): Promise<number> {
  try {
    const key = `fraud:coords:${matchId}`;
    const coordKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const count = await redis.hget(key, coordKey);
    return count ? parseInt(String(count), 10) : 0;
  } catch (error) {
    logger.error('Failed to get coordinate count', {
      matchId,
      error
    });
    return 0;
  }
}

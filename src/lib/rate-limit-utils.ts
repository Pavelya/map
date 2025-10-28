import { redis } from './redis';
import { logger } from './logger';
import { RateLimitResult } from './rate-limit';

/**
 * Generate consistent rate limit keys
 */
export function getRateLimitKey(
  type: 'vote-fp' | 'vote-ip' | 'api',
  identifier: string,
  matchId?: string
): string {
  switch (type) {
    case 'vote-fp':
      if (!matchId) throw new Error('matchId is required for vote-fp rate limit key');
      return `vote:fp:${identifier}:${matchId}`;
    case 'vote-ip':
      if (!matchId) throw new Error('matchId is required for vote-ip rate limit key');
      return `vote:ip:${identifier}:${matchId}`;
    case 'api':
      return `api:${identifier}`;
    default:
      throw new Error(`Unknown rate limit type: ${type}`);
  }
}

/**
 * Check if request should be allowed without incrementing counter
 * This is useful for checking status without consuming a request
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult | null> {
  try {
    // Get current window data from Redis
    const windowData = await redis.get(key);
    
    if (!windowData) {
      // No data means no requests made yet
      return null;
    }

    logger.debug('Rate limit status check', { key, windowData });
    
    // Note: This is a simplified check. In a real implementation,
    // you'd need to parse the sliding window data structure
    // For now, return null to indicate no current limit data
    return null;
  } catch (error) {
    logger.error('Rate limit check failed', { key, error });
    return null;
  }
}

/**
 * Manual reset of rate limit (admin function)
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    logger.info('Rate limit reset', { key });
    return true;
  } catch (error) {
    logger.error('Rate limit reset failed', { key, error });
    return false;
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(key: string): Promise<{
  exists: boolean;
  ttl?: number;
  data?: any;
}> {
  try {
    const [exists, ttl, data] = await Promise.all([
      redis.exists(key),
      redis.ttl(key),
      redis.get(key),
    ]);

    logger.debug('Rate limit status', { key, exists, ttl, data });

    const result: { exists: boolean; ttl?: number; data?: string } = {
      exists: exists === 1,
    };
    if (ttl > 0) {
      result.ttl = ttl;
    }
    if (data && typeof data === 'string') {
      result.data = data;
    }
    return result;
  } catch (error) {
    logger.error('Get rate limit status failed', { key, error });
    return { exists: false };
  }
}

/**
 * Batch reset multiple rate limit keys
 */
export async function batchResetRateLimit(keys: string[]): Promise<{
  success: string[];
  failed: string[];
}> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const key of keys) {
    const result = await resetRateLimit(key);
    if (result) {
      success.push(key);
    } else {
      failed.push(key);
    }
  }

  logger.info('Batch rate limit reset completed', {
    total: keys.length,
    success: success.length,
    failed: failed.length,
  });

  return { success, failed };
}

/**
 * Get all rate limit keys for a specific identifier
 */
export async function getRateLimitKeysForIdentifier(
  identifier: string,
  type?: 'vote-fp' | 'vote-ip' | 'api'
): Promise<string[]> {
  try {
    let pattern: string;
    
    if (type) {
      switch (type) {
        case 'vote-fp':
          pattern = `vote:fp:${identifier}:*`;
          break;
        case 'vote-ip':
          pattern = `vote:ip:${identifier}:*`;
          break;
        case 'api':
          pattern = `api:${identifier}`;
          break;
      }
    } else {
      // Get all keys for this identifier
      pattern = `*:${identifier}*`;
    }

    const keys = await redis.keys(pattern);
    logger.debug('Found rate limit keys', { identifier, type, pattern, count: keys.length });
    
    return keys;
  } catch (error) {
    logger.error('Failed to get rate limit keys', { identifier, type, error });
    return [];
  }
}
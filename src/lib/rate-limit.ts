import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
import { logger } from './logger';

// Get rate limit values from environment variables
const RATE_LIMIT_VOTE_PER_MINUTE = parseInt(process.env['RATE_LIMIT_VOTE_PER_MINUTE'] || '3', 10);
const RATE_LIMIT_VOTE_PER_HOUR = parseInt(process.env['RATE_LIMIT_VOTE_PER_HOUR'] || '20', 10);
const RATE_LIMIT_API_PER_MINUTE = parseInt(process.env['RATE_LIMIT_API_PER_MINUTE'] || '60', 10);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Vote Rate Limiter (per fingerprint)
 * Sliding window: RATE_LIMIT_VOTE_PER_MINUTE requests per 60 seconds
 * Key: vote:fp:{fingerprintHash}:{matchId}
 */
export const voteRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_VOTE_PER_MINUTE, '60 s'),
  analytics: true,
});

/**
 * IP Rate Limiter (per IP)
 * Sliding window: RATE_LIMIT_VOTE_PER_HOUR requests per 3600 seconds
 * Key: vote:ip:{ipHash}:{matchId}
 */
export const ipRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_VOTE_PER_HOUR, '3600 s'),
  analytics: true,
});

/**
 * API Rate Limiter (general endpoints)
 * Sliding window: RATE_LIMIT_API_PER_MINUTE requests per 60 seconds
 * Key: api:{identifier}
 */
export const apiRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(RATE_LIMIT_API_PER_MINUTE, '60 s'),
  analytics: true,
});

/**
 * Check vote rate limit for a fingerprint
 */
export async function checkVoteRateLimit(
  fingerprintHash: string,
  matchId: string
): Promise<RateLimitResult> {
  const key = `vote:fp:${fingerprintHash}:${matchId}`;
  
  try {
    const result = await voteRateLimiter.limit(key);
    
    logger.debug('Vote rate limit check', {
      key,
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });

    if (!result.success) {
      logger.warn('Vote rate limit exceeded', {
        key,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      });
    }

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    logger.error('Vote rate limit check failed', { key, error });
    // Fallback: allow request if rate limiter fails
    return {
      success: true,
      limit: RATE_LIMIT_VOTE_PER_MINUTE,
      remaining: RATE_LIMIT_VOTE_PER_MINUTE - 1,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Check IP rate limit
 */
export async function checkIpRateLimit(
  ipHash: string,
  matchId: string
): Promise<RateLimitResult> {
  const key = `vote:ip:${ipHash}:${matchId}`;
  
  try {
    const result = await ipRateLimiter.limit(key);
    
    logger.debug('IP rate limit check', {
      key,
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });

    if (!result.success) {
      logger.warn('IP rate limit exceeded', {
        key,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      });
    }

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    logger.error('IP rate limit check failed', { key, error });
    // Fallback: allow request if rate limiter fails
    return {
      success: true,
      limit: RATE_LIMIT_VOTE_PER_HOUR,
      remaining: RATE_LIMIT_VOTE_PER_HOUR - 1,
      reset: Date.now() + 3600000,
    };
  }
}

/**
 * Check API rate limit
 */
export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  const key = `api:${identifier}`;
  
  try {
    const result = await apiRateLimiter.limit(key);
    
    logger.debug('API rate limit check', {
      key,
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });

    if (!result.success) {
      logger.warn('API rate limit exceeded', {
        key,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      });
    }

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    logger.error('API rate limit check failed', { key, error });
    // Fallback: allow request if rate limiter fails
    return {
      success: true,
      limit: RATE_LIMIT_API_PER_MINUTE,
      remaining: RATE_LIMIT_API_PER_MINUTE - 1,
      reset: Date.now() + 60000,
    };
  }
}
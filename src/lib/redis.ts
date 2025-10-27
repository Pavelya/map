import { Redis } from '@upstash/redis';
import { logger } from './logger';

// Validate required environment variables
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_REDIS_REST_URL) {
  throw new Error('UPSTASH_REDIS_REST_URL environment variable is required');
}

if (!UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('UPSTASH_REDIS_REST_TOKEN environment variable is required');
}

// Initialize Redis client
export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    if (result === 'PONG') {
      logger.info('Redis connection successful');
      return true;
    } else {
      logger.error('Redis connection failed: unexpected ping response', { result });
      return false;
    }
  } catch (error) {
    logger.error('Redis connection failed', { error: error instanceof Error ? error.message : error });
    return false;
  }
}

// Test connection on module load
testRedisConnection().catch((error) => {
  logger.error('Failed to test Redis connection on startup', { error });
});
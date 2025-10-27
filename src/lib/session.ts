import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';

const SESSION_PREFIX = 'session';
const SESSION_TTL = 3600; // 1 hour in seconds (matches access token expiration)

/**
 * Generate Redis key for session storage
 * @param adminId - Admin user ID
 * @param token - JWT token
 * @returns Redis key
 */
function getSessionKey(adminId: string, token: string): string {
  // Use a hash of the token to avoid storing full token in Redis key
  const tokenHash = Buffer.from(token).toString('base64').substring(0, 16);
  return `${SESSION_PREFIX}:${adminId}:${tokenHash}`;
}

/**
 * Create a new session in Redis
 * @param adminId - Admin user ID
 * @param token - JWT access token
 * @param metadata - Additional session metadata
 */
export async function createSession(
  adminId: string,
  token: string,
  metadata?: Record<string, string>
): Promise<void> {
  try {
    const key = getSessionKey(adminId, token);
    const sessionData = {
      adminId,
      createdAt: new Date().toISOString(),
      ...metadata,
    };

    await redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));

    logger.info('Session created', { adminId, key, ttl: SESSION_TTL });
  } catch (error) {
    logger.error('Failed to create session', { error, adminId });
    throw new Error('Session creation failed');
  }
}

/**
 * Validate if a session exists and is active
 * @param adminId - Admin user ID
 * @param token - JWT access token
 * @returns True if session is valid
 */
export async function validateSession(adminId: string, token: string): Promise<boolean> {
  try {
    const key = getSessionKey(adminId, token);
    const sessionData = await redis.get(key);

    const isValid = sessionData !== null;
    logger.info('Session validation', { adminId, key, isValid });

    return isValid;
  } catch (error) {
    logger.error('Failed to validate session', { error, adminId });
    return false;
  }
}

/**
 * Get session data from Redis
 * @param adminId - Admin user ID
 * @param token - JWT access token
 * @returns Session data or null if not found
 */
export async function getSession(
  adminId: string,
  token: string
): Promise<Record<string, string> | null> {
  try {
    const key = getSessionKey(adminId, token);
    const sessionData = await redis.get(key);

    if (!sessionData || typeof sessionData !== 'string') {
      logger.info('Session not found', { adminId, key });
      return null;
    }

    return JSON.parse(sessionData);
  } catch (error) {
    logger.error('Failed to get session', { error, adminId });
    return null;
  }
}

/**
 * Revoke a session by deleting it from Redis
 * @param adminId - Admin user ID
 * @param token - JWT access token
 */
export async function revokeSession(adminId: string, token: string): Promise<void> {
  try {
    const key = getSessionKey(adminId, token);
    const result = await redis.del(key);

    logger.info('Session revoked', { adminId, key, deleted: result === 1 });
  } catch (error) {
    logger.error('Failed to revoke session', { error, adminId });
    throw new Error('Session revocation failed');
  }
}

/**
 * Revoke all sessions for a specific admin user
 * @param adminId - Admin user ID
 */
export async function revokeAllSessions(adminId: string): Promise<void> {
  try {
    const pattern = `${SESSION_PREFIX}:${adminId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('All sessions revoked', { adminId, count: keys.length });
    } else {
      logger.info('No sessions to revoke', { adminId });
    }
  } catch (error) {
    logger.error('Failed to revoke all sessions', { error, adminId });
    throw new Error('Failed to revoke all sessions');
  }
}

/**
 * Extend session TTL (refresh session expiration)
 * @param adminId - Admin user ID
 * @param token - JWT access token
 */
export async function extendSession(adminId: string, token: string): Promise<void> {
  try {
    const key = getSessionKey(adminId, token);
    const exists = await redis.exists(key);

    if (exists) {
      await redis.expire(key, SESSION_TTL);
      logger.info('Session extended', { adminId, key, newTtl: SESSION_TTL });
    } else {
      logger.warn('Attempted to extend non-existent session', { adminId, key });
    }
  } catch (error) {
    logger.error('Failed to extend session', { error, adminId });
    throw new Error('Session extension failed');
  }
}

/**
 * Get all active sessions for an admin user
 * @param adminId - Admin user ID
 * @returns Array of session data
 */
export async function getAdminSessions(adminId: string): Promise<Record<string, string>[]> {
  try {
    const pattern = `${SESSION_PREFIX}:${adminId}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return [];
    }

    const sessions: Record<string, string>[] = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data && typeof data === 'string') {
        sessions.push(JSON.parse(data));
      }
    }

    logger.info('Retrieved admin sessions', { adminId, count: sessions.length });
    return sessions;
  } catch (error) {
    logger.error('Failed to get admin sessions', { error, adminId });
    return [];
  }
}

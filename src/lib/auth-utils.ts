import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';

const JWT_SECRET = process.env['JWT_SECRET']!;
const JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;
const SALT_ROUNDS = parseInt(process.env['ADMIN_PASSWORD_SALT_ROUNDS'] || '12', 10);

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables');
}

export interface TokenPayload {
  adminId: string;
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    logger.info('Password hashed successfully', { saltRounds: SALT_ROUNDS });
    return hash;
  } catch (error) {
    logger.error('Failed to hash password', { error });
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if passwords match
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const match = await bcrypt.compare(password, hash);
    logger.info('Password comparison completed', { match });
    return match;
  } catch (error) {
    logger.error('Failed to compare password', { error });
    throw new Error('Password comparison failed');
  }
}

/**
 * Generate a JWT access token (1 hour expiration)
 * @param adminId - Admin user ID
 * @param username - Admin username
 * @returns JWT token string
 */
export function generateToken(adminId: string, username: string): string {
  try {
    const payload: TokenPayload = {
      adminId,
      username,
      type: 'access',
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '1h',
      issuer: 'team-vote-map',
      audience: 'admin',
    });

    logger.info('Access token generated', { adminId, username, expiresIn: '1h' });
    return token;
  } catch (error) {
    logger.error('Failed to generate access token', { error, adminId, username });
    throw new Error('Token generation failed');
  }
}

/**
 * Generate a JWT refresh token (7 days expiration)
 * @param adminId - Admin user ID
 * @returns Refresh token string
 */
export function generateRefreshToken(adminId: string): string {
  try {
    const payload: TokenPayload = {
      adminId,
      username: '', // Username not needed in refresh token
      type: 'refresh',
    };

    const token = jwt.sign(payload, JWT_REFRESH_SECRET, {
      expiresIn: '7d',
      issuer: 'team-vote-map',
      audience: 'admin',
    });

    logger.info('Refresh token generated', { adminId, expiresIn: '7d' });
    return token;
  } catch (error) {
    logger.error('Failed to generate refresh token', { error, adminId });
    throw new Error('Refresh token generation failed');
  }
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @param isRefreshToken - Whether this is a refresh token
 * @returns Decoded token payload
 */
export function verifyToken(token: string, isRefreshToken = false): TokenPayload {
  try {
    const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
    const decoded = jwt.verify(token, secret, {
      issuer: 'team-vote-map',
      audience: 'admin',
    }) as TokenPayload;

    logger.info('Token verified successfully', {
      adminId: decoded.adminId,
      type: decoded.type,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown'
    });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', { error });
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { error });
      throw new Error('Invalid token');
    } else {
      logger.error('Token verification failed', { error });
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Extract JWT token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.warn('Invalid authorization header format', { authHeader: authHeader.substring(0, 20) });
    return null;
  }

  return parts[1] || null;
}

/**
 * Validate password strength
 * @param password - Plain text password
 * @returns Validation result
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

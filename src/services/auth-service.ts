import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyToken,
  validatePassword,
} from '@/lib/auth-utils';
import { createSession, revokeSession, revokeAllSessions } from '@/lib/session';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  created_at: string;
  last_login_at?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

/**
 * Create a new admin user
 * @param username - Admin username
 * @param password - Plain text password
 * @param email - Admin email
 * @returns Created admin user
 */
export async function createAdmin(
  username: string,
  password: string,
  email: string
): Promise<AdminUser> {
  try {
    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.valid) {
      const errorMsg = `Password validation failed: ${validation.errors.join(', ')}`;
      logger.warn('Admin creation failed - weak password', { username, errors: validation.errors });
      throw new Error(errorMsg);
    }

    // Check if username already exists
    const existingUser = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM admin_users WHERE username = $1',
      [username]
    );

    if (existingUser.rows[0]?.count && existingUser.rows[0].count > 0) {
      logger.warn('Admin creation failed - username exists', { username });
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await query<{ count: number }>(
      'SELECT COUNT(*) as count FROM admin_users WHERE email = $1',
      [email]
    );

    if (existingEmail.rows[0]?.count && existingEmail.rows[0].count > 0) {
      logger.warn('Admin creation failed - email exists', { email });
      throw new Error('Email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert admin user
    const result = await query<AdminUser>(
      `INSERT INTO admin_users (username, password_hash, email, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, username, email, created_at`,
      [username, passwordHash, email]
    );

    const admin = result.rows[0];
    if (!admin) {
      throw new Error('Failed to create admin user');
    }
    logger.info('Admin user created successfully', { adminId: admin.id, username, email });

    return admin;
  } catch (error) {
    logger.error('Failed to create admin user', { error, username, email });
    throw error;
  }
}

/**
 * Authenticate an admin user
 * @param username - Admin username
 * @param password - Plain text password
 * @returns Auth response with tokens and admin data
 */
export async function authenticateAdmin(
  username: string,
  password: string
): Promise<AuthResponse> {
  try {
    // Find admin user by username
    const result = await query<AdminUser & { password_hash: string }>(
      'SELECT id, username, email, password_hash, created_at, last_login_at FROM admin_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      logger.warn('Authentication failed - user not found', { username });
      throw new Error('Invalid credentials');
    }

    const admin = result.rows[0];
    if (!admin) {
      logger.warn('Authentication failed - user not found', { username });
      throw new Error('Invalid credentials');
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, admin.password_hash);

    if (!isPasswordValid) {
      logger.warn('Authentication failed - invalid password', { username, adminId: admin.id });
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateToken(admin.id, admin.username);
    const refreshToken = generateRefreshToken(admin.id);

    // Create session
    await createSession(admin.id, accessToken, {
      username: admin.username,
      loginAt: new Date().toISOString(),
    });

    // Update last login timestamp
    await query(
      'UPDATE admin_users SET last_login_at = NOW() WHERE id = $1',
      [admin.id]
    );

    logger.info('Admin authenticated successfully', { adminId: admin.id, username });

    const adminResponse: AdminUser = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      created_at: admin.created_at,
    };

    if (admin.last_login_at) {
      adminResponse.last_login_at = admin.last_login_at;
    }

    return {
      accessToken,
      refreshToken,
      admin: adminResponse,
    };
  } catch (error) {
    logger.error('Authentication failed', { error, username });
    throw error;
  }
}

/**
 * Verify a JWT token and return admin data
 * @param token - JWT access token
 * @returns Admin user data
 */
export async function verifyAdminToken(token: string): Promise<AdminUser> {
  try {
    // Verify and decode token
    const decoded = verifyToken(token, false);

    // Validate session exists in Redis
    const sessionValid = await validateSession(decoded.adminId, token);
    if (!sessionValid) {
      logger.warn('Token verification failed - session not found', { adminId: decoded.adminId });
      throw new Error('Invalid session');
    }

    // Fetch admin data from database
    const result = await query<AdminUser>(
      'SELECT id, username, email, created_at, last_login_at FROM admin_users WHERE id = $1',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      logger.warn('Token verification failed - admin not found', { adminId: decoded.adminId });
      throw new Error('Admin user not found');
    }

    const admin = result.rows[0];
    if (!admin) {
      logger.warn('Token verification failed - admin not found', { adminId: decoded.adminId });
      throw new Error('Admin user not found');
    }

    logger.info('Token verified successfully', { adminId: decoded.adminId });
    return admin;
  } catch (error) {
    logger.error('Token verification failed', { error });
    throw error;
  }
}

/**
 * Validate session exists
 * @param adminId - Admin user ID
 * @param token - JWT access token
 * @returns True if session is valid
 */
async function validateSession(adminId: string, token: string): Promise<boolean> {
  const { validateSession: validateSessionFunc } = await import('@/lib/session');
  return validateSessionFunc(adminId, token);
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - JWT refresh token
 * @returns New access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken, true);

    if (decoded.type !== 'refresh') {
      logger.warn('Refresh token verification failed - invalid type', { type: decoded.type });
      throw new Error('Invalid refresh token');
    }

    // Fetch admin data to ensure user still exists
    const result = await query<AdminUser>(
      'SELECT id, username, email FROM admin_users WHERE id = $1',
      [decoded.adminId]
    );

    if (result.rows.length === 0) {
      logger.warn('Refresh token verification failed - admin not found', { adminId: decoded.adminId });
      throw new Error('Admin user not found');
    }

    const admin = result.rows[0];
    if (!admin) {
      logger.warn('Refresh token verification failed - admin not found', { adminId: decoded.adminId });
      throw new Error('Admin user not found');
    }

    // Generate new access token
    const newAccessToken = generateToken(admin.id, admin.username);

    // Create new session
    await createSession(admin.id, newAccessToken, {
      username: admin.username,
      refreshedAt: new Date().toISOString(),
    });

    logger.info('Access token refreshed', { adminId: admin.id, username: admin.username });

    return newAccessToken;
  } catch (error) {
    logger.error('Failed to refresh access token', { error });
    throw error;
  }
}

/**
 * Logout admin user
 * @param adminId - Admin user ID
 * @param token - JWT access token
 */
export async function logout(adminId: string, token: string): Promise<void> {
  try {
    // Revoke session
    await revokeSession(adminId, token);

    logger.info('Admin logged out successfully', { adminId });
  } catch (error) {
    logger.error('Logout failed', { error, adminId });
    throw error;
  }
}

/**
 * Change admin password
 * @param adminId - Admin user ID
 * @param oldPassword - Current password
 * @param newPassword - New password
 */
export async function changePassword(
  adminId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  try {
    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      const errorMsg = `Password validation failed: ${validation.errors.join(', ')}`;
      logger.warn('Password change failed - weak password', { adminId, errors: validation.errors });
      throw new Error(errorMsg);
    }

    // Fetch current password hash
    const result = await query<{ password_hash: string }>(
      'SELECT password_hash FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      logger.warn('Password change failed - admin not found', { adminId });
      throw new Error('Admin user not found');
    }

    // Verify old password
    const passwordHash = result.rows[0]?.password_hash;
    if (!passwordHash) {
      logger.warn('Password change failed - password hash not found', { adminId });
      throw new Error('Admin user not found');
    }
    const isOldPasswordValid = await comparePassword(oldPassword, passwordHash);

    if (!isOldPasswordValid) {
      logger.warn('Password change failed - invalid old password', { adminId });
      throw new Error('Invalid old password');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, adminId]
    );

    // Revoke all existing sessions to force re-login
    await revokeAllSessions(adminId);

    logger.info('Password changed successfully', { adminId });
  } catch (error) {
    logger.error('Failed to change password', { error, adminId });
    throw error;
  }
}

/**
 * Get admin user by ID
 * @param adminId - Admin user ID
 * @returns Admin user data
 */
export async function getAdminById(adminId: string): Promise<AdminUser | null> {
  try {
    const result = await query<AdminUser>(
      'SELECT id, username, email, created_at, last_login_at FROM admin_users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      logger.info('Admin not found', { adminId });
      return null;
    }

    return result.rows[0] ?? null;
  } catch (error) {
    logger.error('Failed to get admin by ID', { error, adminId });
    throw error;
  }
}

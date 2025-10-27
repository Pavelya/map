import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
}

export interface JWTPayload {
  adminId: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Verify JWT token and return admin user
 */
export async function verifyAdminToken(token: string): Promise<{
  isValid: boolean;
  admin?: AdminUser;
  error?: string;
}> {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return {
        isValid: false,
        error: 'Authentication not configured'
      };
    }

    // Verify and decode token
    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Verify admin still exists and is active
    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('id, username, email')
      .eq('id', decoded.adminId)
      .single();

    if (error || !admin) {
      logger.warn('Invalid admin token - user not found', {
        adminId: decoded.adminId,
        error: error?.message
      });
      return {
        isValid: false,
        error: 'Invalid token'
      };
    }

    return {
      isValid: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: error.message });
      return {
        isValid: false,
        error: 'Invalid token'
      };
    }

    logger.error('Error verifying admin token', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      isValid: false,
      error: 'Authentication error'
    };
  }
}

/**
 * Extract admin from request headers
 */
export async function getAdminFromRequest(request: Request): Promise<{
  admin?: AdminUser;
  error?: string;
}> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return { error: 'Authorization header missing' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { error: 'Invalid authorization format' };
  }

  const token = authHeader.substring(7);
  const result = await verifyAdminToken(token);

  if (!result.isValid) {
    return { error: result.error };
  }

  return { admin: result.admin };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback - this might not be the real client IP in production
  return '127.0.0.1';
}
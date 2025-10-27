import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/services/auth-service';
import { extractTokenFromHeader } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export interface AuthenticatedRequest extends NextRequest {
  admin?: {
    id: string;
    username: string;
    email: string;
  };
}

/**
 * Extract token from request (Authorization header or cookie)
 * @param request - Next.js request object
 * @returns Token string or null
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = extractTokenFromHeader(authHeader);
    if (token) {
      return token;
    }
  }

  // Try cookie as fallback
  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Middleware to require authentication for admin routes
 * Attaches admin data to the request object if authenticated
 * @returns NextResponse with 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    // Extract token from request
    const token = getTokenFromRequest(request);

    if (!token) {
      logger.warn('Authentication required - no token provided', {
        path: request.nextUrl.pathname,
        method: request.method,
      });

      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get admin data
    const admin = await verifyAdminToken(token);

    // Log successful authentication
    logger.info('Request authenticated', {
      adminId: admin.id,
      username: admin.username,
      path: request.nextUrl.pathname,
      method: request.method,
    });

    // Token is valid, allow request to proceed
    // Note: We can't modify the request object directly in middleware,
    // so the route handler will need to re-verify the token
    return null;
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: request.nextUrl.pathname,
      method: request.method,
    });

    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * Helper function to get authenticated admin from request
 * Use this in route handlers to extract admin data
 * @param request - Next.js request object
 * @returns Admin user data or null
 */
export async function getAuthenticatedAdmin(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return null;
    }

    const admin = await verifyAdminToken(token);
    return admin;
  } catch (error) {
    logger.error('Failed to get authenticated admin', { error });
    return null;
  }
}

/**
 * Wrapper function to protect API routes
 * Returns admin data if authenticated, or throws error
 * @param request - Next.js request object
 * @returns Admin user data
 * @throws Error if not authenticated
 */
export async function requireAuthOrThrow(request: NextRequest) {
  const admin = await getAuthenticatedAdmin(request);

  if (!admin) {
    throw new Error('Authentication required');
  }

  return admin;
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/middleware/auth';
import { logout } from '@/services/auth-service';
import { extractTokenFromHeader } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/auth/logout
 * Logout admin user and invalidate session
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated admin
    const admin = await getAuthenticatedAdmin(request);

    if (!admin) {
      logger.warn('Logout attempt without authentication');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract token from request
    const authHeader = request.headers.get('authorization');
    const token = authHeader
      ? extractTokenFromHeader(authHeader)
      : request.cookies.get('access_token')?.value;

    if (!token) {
      logger.warn('Logout attempt without token', { adminId: admin.id });
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 400 }
      );
    }

    // Logout and revoke session
    await logout(admin.id, token);

    logger.info('Admin logged out', {
      adminId: admin.id,
      username: admin.username,
    });

    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear cookies
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    logger.error('Logout endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth/logout
 * Return method not allowed for GET requests
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

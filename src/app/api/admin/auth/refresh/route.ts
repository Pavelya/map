import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/services/auth-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/auth/refresh
 * Refresh access token using refresh token
 */
export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from cookie
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      logger.warn('Refresh attempt without refresh token');
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    // Generate new access token
    const newAccessToken = await refreshAccessToken(refreshToken);

    logger.info('Access token refreshed successfully');

    // Create response
    const response = NextResponse.json(
      { accessToken: newAccessToken },
      { status: 200 }
    );

    // Update access token cookie
    response.cookies.set('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error('Refresh token endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Clear invalid refresh token cookie
    const response = NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );

    response.cookies.delete('refresh_token');
    response.cookies.delete('access_token');

    return response;
  }
}

/**
 * GET /api/admin/auth/refresh
 * Return method not allowed for GET requests
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/middleware/auth';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/me
 * Get current authenticated admin user details
 * This is a protected endpoint that requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated admin
    const admin = await getAuthenticatedAdmin(request);

    if (!admin) {
      logger.warn('Unauthorized access attempt to /api/admin/me');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    logger.info('Admin profile retrieved', { adminId: admin.id, username: admin.username });

    return NextResponse.json(
      {
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          created_at: admin.created_at,
          last_login_at: admin.last_login_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Admin profile endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

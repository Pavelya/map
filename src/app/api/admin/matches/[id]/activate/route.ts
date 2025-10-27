import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import { activateMatch } from '@/services/match-service';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/admin/matches/[id]/activate - Activate match
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const matchId = params.id;

  try {
    logger.info('Admin activate match request', { clientIP, matchId });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin activate match request', { clientIP, matchId, error: authError });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate match ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(matchId)) {
      return NextResponse.json(
        { error: 'Invalid match ID format' },
        { status: 400 }
      );
    }

    // Activate match
    const result = await activateMatch(matchId, admin.id, clientIP);

    if (!result.success) {
      let status = 400;
      if (result.code === 'NOT_FOUND') status = 404;
      else if (result.code === 'MATCH_ALREADY_ACTIVE') status = 409;
      
      logger.error('Failed to activate match', {
        adminId: admin.id,
        matchId,
        error: result.error,
        code: result.code
      });
      
      return NextResponse.json(
        { error: result.error },
        { status }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Match activated successfully', {
      adminId: admin.id,
      matchId,
      title: result.data?.title,
      duration
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'Match activated successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin activate match', {
      clientIP,
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import { MatchUpdateSchema } from '@/lib/validations/match';
import { getMatch, updateMatch, deleteMatch, getMatchStats } from '@/services/match-service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/admin/matches/[id] - Get match details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const matchId = params.id;

  try {
    logger.info('Admin get match request', { clientIP, matchId });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin get match request', { clientIP, matchId, error: authError });
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

    // Get match
    const matchResult = await getMatch(matchId);
    if (!matchResult.success) {
      const status = matchResult.code === 'NOT_FOUND' ? 404 : 500;
      return NextResponse.json(
        { error: matchResult.error },
        { status }
      );
    }

    // Get match stats
    const statsResult = await getMatchStats(matchId);
    const stats = statsResult.success ? statsResult.data : null;

    const duration = Date.now() - startTime;
    logger.info('Admin match retrieved successfully', {
      adminId: admin.id,
      matchId,
      title: matchResult.data?.title,
      duration
    });

    return NextResponse.json({
      success: true,
      data: {
        match: matchResult.data,
        stats
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin get match', {
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

/**
 * PUT /api/admin/matches/[id] - Update match
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const matchId = params.id;

  try {
    logger.info('Admin update match request', { clientIP, matchId });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin update match request', { clientIP, matchId, error: authError });
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

    // Parse request body
    const body = await request.json();

    // Validate update data
    const validation = MatchUpdateSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Invalid match update data', {
        adminId: admin.id,
        matchId,
        errors: validation.error.errors
      });
      return NextResponse.json(
        { 
          error: 'Invalid match data',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const updateData = validation.data;

    // Update match
    const result = await updateMatch(matchId, updateData, admin.id, clientIP);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      logger.error('Failed to update match', {
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
    logger.info('Match updated successfully', {
      adminId: admin.id,
      matchId,
      title: result.data?.title,
      updateFields: Object.keys(updateData),
      duration
    });

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin update match', {
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

/**
 * DELETE /api/admin/matches/[id] - Delete match
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const matchId = params.id;

  try {
    logger.info('Admin delete match request', { clientIP, matchId });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin delete match request', { clientIP, matchId, error: authError });
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

    // Delete match
    const result = await deleteMatch(matchId, admin.id, clientIP);

    if (!result.success) {
      const status = result.code === 'NOT_FOUND' ? 404 : 400;
      logger.error('Failed to delete match', {
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
    logger.info('Match deleted successfully', {
      adminId: admin.id,
      matchId,
      duration
    });

    return NextResponse.json({
      success: true,
      message: 'Match deleted successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin delete match', {
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
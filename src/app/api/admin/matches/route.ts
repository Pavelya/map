import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import { MatchSchema, MatchFiltersSchema } from '@/lib/validations/match';
import { createMatch, listMatches } from '@/services/match-service';
import { scheduleMatchActivation, scheduleMatchEnd } from '@/services/match-scheduler';

/**
 * GET /api/admin/matches - List all matches with filters
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    logger.info('Admin matches list request', { clientIP });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin matches list request', { clientIP, error: authError });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      search: searchParams.get('search') || undefined
    };

    // Validate filters
    const filtersValidation = MatchFiltersSchema.safeParse(filters);
    if (!filtersValidation.success) {
      logger.warn('Invalid match filters', {
        adminId: admin.id,
        filters,
        errors: filtersValidation.error.errors
      });
      return NextResponse.json(
        { 
          error: 'Invalid filters',
          details: filtersValidation.error.errors
        },
        { status: 400 }
      );
    }

    // List matches
    const result = await listMatches(filtersValidation.data);

    if (!result.success) {
      logger.error('Failed to list matches', {
        adminId: admin.id,
        error: result.error,
        code: result.code
      });
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Admin matches listed successfully', {
      adminId: admin.id,
      filters: filtersValidation.data,
      resultCount: result.data?.matches.length,
      total: result.data?.total,
      duration
    });

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin matches list', {
      clientIP,
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
 * POST /api/admin/matches - Create new match
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    logger.info('Admin create match request', { clientIP });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin create match request', { clientIP, error: authError });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate match data
    const validation = MatchSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Invalid match data', {
        adminId: admin.id,
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

    const matchData = validation.data;

    // Create match
    const result = await createMatch(matchData, admin.id, clientIP);

    if (!result.success) {
      logger.error('Failed to create match', {
        adminId: admin.id,
        error: result.error,
        code: result.code
      });
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    const match = result.data!;

    // Schedule match activation and end if needed
    if (match.status === 'scheduled') {
      await scheduleMatchActivation(match.id, match.startTime);
      await scheduleMatchEnd(match.id, match.endTime);
    }

    const duration = Date.now() - startTime;
    logger.info('Match created successfully', {
      adminId: admin.id,
      matchId: match.id,
      title: match.title,
      status: match.status,
      duration
    });

    return NextResponse.json({
      success: true,
      data: match
    }, { status: 201 });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin create match', {
      clientIP,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
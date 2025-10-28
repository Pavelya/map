import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import { supabase } from '@/lib/db';
import type { FraudSeverity } from '@/services/fraud-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/fraud - List fraud events with filters
 * Query params:
 * - matchId: Filter by match
 * - severity: Filter by severity (low, medium, high, critical)
 * - reviewed: Filter by review status (true, false)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    logger.info('Admin fraud events list request', { clientIP });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin fraud events request', { clientIP, error: authError });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId') || undefined;
    const severity = searchParams.get('severity') as FraudSeverity | undefined;
    const reviewedParam = searchParams.get('reviewed');
    const reviewed = reviewedParam === 'true' ? true : reviewedParam === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // Validate severity
    if (severity && !['low', 'medium', 'high', 'critical'].includes(severity)) {
      return NextResponse.json(
        { error: 'Invalid severity value' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('fraud_events')
      .select('*', { count: 'exact' })
      .order('detected_at', { ascending: false });

    if (matchId) {
      query = query.eq('match_id', matchId);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (reviewed !== undefined) {
      query = query.eq('reviewed', reviewed);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: events, error, count } = await query;

    if (error) {
      logger.error('Failed to list fraud events', {
        adminId: admin.id,
        error
      });
      return NextResponse.json(
        { error: 'Failed to retrieve fraud events' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Admin fraud events listed successfully', {
      adminId: admin.id,
      matchId,
      severity,
      reviewed,
      resultCount: events.length,
      total: count,
      duration
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin fraud events list', {
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

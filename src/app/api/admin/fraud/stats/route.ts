import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import {
  getFraudStats,
  getFraudTrends,
  getMostFlaggedIPs,
  getMostFlaggedFingerprints,
  getReviewProgress,
  getFraudEventsByType
} from '@/services/fraud-stats';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/fraud/stats - Get fraud statistics
 * Query params:
 * - matchId: Filter by match (optional)
 * - type: Type of stats (overview, trends, offenders, types)
 * - days: Number of days for trends (default: 7)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);

  try {
    logger.info('Admin fraud stats request', { clientIP });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin fraud stats request', { clientIP, error: authError });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId') || undefined;
    const type = searchParams.get('type') || 'overview';
    const days = parseInt(searchParams.get('days') || '7');

    let result: any = {};

    switch (type) {
      case 'overview':
        if (!matchId) {
          return NextResponse.json(
            { error: 'matchId is required for overview stats' },
            { status: 400 }
          );
        }
        result = await getFraudStats(matchId);
        break;

      case 'trends':
        result = await getFraudTrends(matchId, days);
        break;

      case 'offenders':
        if (!matchId) {
          return NextResponse.json(
            { error: 'matchId is required for offenders stats' },
            { status: 400 }
          );
        }
        const [ips, fingerprints] = await Promise.all([
          getMostFlaggedIPs(matchId, 10),
          getMostFlaggedFingerprints(matchId, 10)
        ]);
        result = { ips, fingerprints };
        break;

      case 'types':
        result = await getFraudEventsByType(matchId);
        break;

      case 'review-progress':
        result = await getReviewProgress();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid stats type' },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;
    logger.info('Admin fraud stats retrieved successfully', {
      adminId: admin.id,
      matchId,
      type,
      duration
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error in admin fraud stats', {
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

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFromRequest, getClientIP } from '@/lib/auth';
import { markFraudEventReviewed } from '@/services/fraud-logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/fraud/[id]/review - Mark a fraud event as reviewed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  const eventId = params.id;

  try {
    logger.info('Admin mark fraud event reviewed request', {
      clientIP,
      eventId
    });

    // Authenticate admin
    const { admin, error: authError } = await getAdminFromRequest(request);
    if (!admin) {
      logger.warn('Unauthorized admin fraud review request', {
        clientIP,
        eventId,
        error: authError
      });
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(eventId)) {
      logger.warn('Invalid fraud event ID format', {
        adminId: admin.id,
        eventId
      });
      return NextResponse.json(
        { error: 'Invalid event ID format' },
        { status: 400 }
      );
    }

    // Mark event as reviewed
    const success = await markFraudEventReviewed(eventId, admin.id);

    if (!success) {
      logger.error('Failed to mark fraud event as reviewed', {
        adminId: admin.id,
        eventId
      });
      return NextResponse.json(
        { error: 'Failed to mark event as reviewed' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logger.info('Fraud event marked as reviewed successfully', {
      adminId: admin.id,
      eventId,
      duration
    });

    return NextResponse.json({
      success: true,
      message: 'Fraud event marked as reviewed'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error marking fraud event as reviewed', {
      clientIP,
      eventId,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

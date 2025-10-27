import { NextRequest, NextResponse } from 'next/server';
import { checkVoteRateLimit, checkIpRateLimit } from '../../../lib/rate-limit';
import { successResponse, errorResponse, validateRequiredFields, getClientIdentifier, hashIdentifier, rateLimitResponse, addRateLimitHeaders } from '../../../lib/api-utils';
import { logger } from '../../../lib/logger';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    // Validate required fields
    const { isValid, missingFields } = validateRequiredFields(body, [
      'matchId',
      'teamId',
      'fingerprintHash'
    ]);
    
    if (!isValid) {
      return errorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        { missingFields }
      );
    }
    
    const { matchId, teamId, fingerprintHash } = body;
    
    // Apply vote rate limiting
    const { ipAddress } = getClientIdentifier(request);
    
    // Check fingerprint-based rate limit
    const hashedFingerprint = await hashIdentifier(fingerprintHash);
    const fingerprintResult = await checkVoteRateLimit(hashedFingerprint, matchId);
    
    if (!fingerprintResult.success) {
      return rateLimitResponse(fingerprintResult.remaining, fingerprintResult.reset, fingerprintResult.limit);
    }
    
    // Check IP-based rate limit
    const hashedIp = await hashIdentifier(ipAddress);
    const ipResult = await checkIpRateLimit(hashedIp, matchId);
    
    if (!ipResult.success) {
      return rateLimitResponse(ipResult.remaining, ipResult.reset, ipResult.limit);
    }
    
    logger.info('Vote submitted', {
      matchId,
      teamId,
      fingerprintHash: fingerprintHash.substring(0, 8) + '...',
    });
    
    // Here you would normally save the vote to the database
    // For now, just return success
    
    const response = successResponse({
      message: 'Vote recorded successfully',
      matchId,
      teamId,
      timestamp: new Date().toISOString(),
    });
    
    // Add rate limit headers (use the more restrictive limit)
    const activeResult = fingerprintResult.remaining < ipResult.remaining ? fingerprintResult : ipResult;
    return addRateLimitHeaders(response, activeResult.limit, activeResult.remaining, activeResult.reset);
    
  } catch (error) {
    logger.error('Vote submission error', { error });
    return errorResponse('Failed to process vote', 500);
  }
}
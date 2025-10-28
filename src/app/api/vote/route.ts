import { NextRequest, NextResponse } from 'next/server';
import { VoteSubmissionSchema } from '@/lib/validations/vote';
import { submitVote } from '@/services/vote-service';
import { logger } from '@/lib/logger';
import { checkVoteRateLimit, checkIpRateLimit } from '@/lib/rate-limit';
import { hashFingerprint, hashIP } from '@/lib/hash';
import type { ErrorResponse, VoteSubmissionData } from '@/types/api';

export const dynamic = 'force-dynamic';

/**
 * Extract client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  
  // Fallback to localhost
  return '127.0.0.1';
}

/**
 * POST /api/vote - Submit a vote
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  
  try {
    // Parse request body
    const body = await request.json();
    
    logger.info('Vote submission request received', {
      ip: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      matchId: body.matchId
    });

    // Validate request body
    const validationResult = VoteSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      logger.warn('Vote submission validation failed', {
        ip: clientIP,
        errors: validationResult.error.errors,
        body: body
      });
      
      const errorResponse: ErrorResponse = {
        error: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        details: validationResult.error.errors
      };
      
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const voteData = validationResult.data;
    const fingerprintHash = hashFingerprint(voteData.fingerprint);
    const ipHash = hashIP(clientIP);

    // Check rate limits BEFORE database access
    const fingerprintRateLimit = await checkVoteRateLimit(fingerprintHash, voteData.matchId);

    if (!fingerprintRateLimit.success) {
      logger.warn('Vote rate limit exceeded for fingerprint', {
        fingerprintHash: fingerprintHash.substring(0, 8) + '...',
        matchId: voteData.matchId,
        remaining: fingerprintRateLimit.remaining,
        reset: fingerprintRateLimit.reset
      });
      
      const errorResponse: ErrorResponse = {
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      };
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': fingerprintRateLimit.limit.toString(),
          'X-RateLimit-Remaining': fingerprintRateLimit.remaining.toString(),
          'X-RateLimit-Reset': fingerprintRateLimit.reset.toString()
        }
      });
    }

    const ipRateLimit = await checkIpRateLimit(ipHash, voteData.matchId);

    if (!ipRateLimit.success) {
      logger.warn('Vote rate limit exceeded for IP', {
        ipHash: ipHash.substring(0, 8) + '...',
        matchId: voteData.matchId,
        remaining: ipRateLimit.remaining,
        reset: ipRateLimit.reset
      });
      
      const errorResponse: ErrorResponse = {
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      };
      
      return NextResponse.json(errorResponse, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': ipRateLimit.limit.toString(),
          'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
          'X-RateLimit-Reset': ipRateLimit.reset.toString()
        }
      });
    }

    // Submit vote
    const result = await submitVote(voteData as VoteSubmissionData, clientIP);
    
    if (!result.success) {
      const statusCode = getStatusCodeForError(result.code);
      const errorResponse: ErrorResponse = {
        error: result.error || 'Vote submission failed',
        code: result.code || 'UNKNOWN_ERROR'
      };
      
      logger.warn('Vote submission failed', {
        matchId: voteData.matchId,
        error: result.error,
        code: result.code,
        statusCode
      });
      
      return NextResponse.json(errorResponse, { status: statusCode });
    }

    const duration = Date.now() - startTime;
    logger.info('Vote submission successful', {
      matchId: voteData.matchId,
      voteId: result.data?.voteId,
      duration: `${duration}ms`
    });

    return NextResponse.json(result.data, { 
      status: 201,
      headers: {
        'X-RateLimit-Limit': fingerprintRateLimit.limit.toString(),
        'X-RateLimit-Remaining': Math.min(fingerprintRateLimit.remaining, ipRateLimit.remaining).toString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Vote submission endpoint error', {
      ip: clientIP,
      error,
      duration: `${duration}ms`
    });

    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Map error codes to HTTP status codes
 */
function getStatusCodeForError(code?: string): number {
  switch (code) {
    case 'VALIDATION_ERROR':
      return 400;
    case 'INVALID_MATCH':
    case 'CAPTCHA_REQUIRED':
    case 'VOTE_LIMIT_EXCEEDED':
      return 400;
    case 'CAPTCHA_FAILED':
      return 400;
    case 'FRAUD_DETECTED':
      return 403;
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'INTERNAL_ERROR':
    case 'TRANSACTION_FAILED':
    case 'VOTE_INSERT_FAILED':
    case 'VOTE_LIMIT_CHECK_FAILED':
    default:
      return 500;
  }
}

/**
 * Handle unsupported methods
 */
export async function GET() {
  const errorResponse: ErrorResponse = {
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  };
  return NextResponse.json(errorResponse, { status: 405 });
}

export async function PUT() {
  const errorResponse: ErrorResponse = {
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  };
  return NextResponse.json(errorResponse, { status: 405 });
}

export async function DELETE() {
  const errorResponse: ErrorResponse = {
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED'
  };
  return NextResponse.json(errorResponse, { status: 405 });
}
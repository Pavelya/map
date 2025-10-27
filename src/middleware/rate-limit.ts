import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, checkVoteRateLimit, checkIpRateLimit } from '../lib/rate-limit';
import { rateLimitResponse, addRateLimitHeaders, getClientIdentifier, hashIdentifier } from '../lib/api-utils';
import { logger } from '../lib/logger';

export interface RateLimitMiddlewareOptions {
  type: 'api' | 'vote';
  skipSuccessHeaders?: boolean;
}

/**
 * Rate limit middleware for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitMiddlewareOptions = { type: 'api' }
): Promise<NextResponse | null> {
  try {
    const { fingerprintHash, ipAddress, identifier } = getClientIdentifier(request);
    const hashedIdentifier = await hashIdentifier(identifier);
    
    console.log('Rate limit middleware check', {
      type: options.type,
      identifier: hashedIdentifier,
      fingerprintHash: fingerprintHash ? 'present' : 'missing',
      ipAddress,
      url: request.url,
    });

    if (options.type === 'api') {
      // API rate limiting
      const result = await checkApiRateLimit(hashedIdentifier);
      
      if (!result.success) {
        console.log('API rate limit exceeded', {
          identifier: hashedIdentifier,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          url: request.url,
        });
        
        return rateLimitResponse(result.remaining, result.reset, result.limit);
      }

      // For API routes, we can't use NextResponse.next()
      // Instead, we'll add headers in the actual route handler
      return null; // Continue to next middleware/handler
    } else if (options.type === 'vote') {
      // Vote rate limiting - check both fingerprint and IP limits
      const url = new URL(request.url);
      const matchId = url.searchParams.get('matchId') || 'unknown';
      
      // Check fingerprint-based rate limit
      let fingerprintResult;
      if (fingerprintHash) {
        const hashedFingerprint = await hashIdentifier(fingerprintHash);
        fingerprintResult = await checkVoteRateLimit(hashedFingerprint, matchId);
        
        if (!fingerprintResult.success) {
          console.log('Vote fingerprint rate limit exceeded', {
            fingerprintHash: hashedFingerprint,
            matchId,
            limit: fingerprintResult.limit,
            remaining: fingerprintResult.remaining,
            reset: fingerprintResult.reset,
          });
          
          return rateLimitResponse(
            fingerprintResult.remaining,
            fingerprintResult.reset,
            fingerprintResult.limit
          );
        }
      }

      // Check IP-based rate limit
      const hashedIp = await hashIdentifier(ipAddress);
      const ipResult = await checkIpRateLimit(hashedIp, matchId);
      
      if (!ipResult.success) {
        console.log('Vote IP rate limit exceeded', {
          ipAddress: hashedIp,
          matchId,
          limit: ipResult.limit,
          remaining: ipResult.remaining,
          reset: ipResult.reset,
        });
        
        return rateLimitResponse(ipResult.remaining, ipResult.reset, ipResult.limit);
      }

      // For API routes, we can't use NextResponse.next()
      // Instead, we'll add headers in the actual route handler
      return null; // Continue to next middleware/handler
    }

    return null;
  } catch (error) {
    logger.error('Rate limit middleware error', {
      error: error instanceof Error ? error.message : error,
      url: request.url,
      type: options.type,
    });
    
    // On error, allow the request to continue (fail open)
    return null;
  }
}

/**
 * Create rate limit middleware for API routes
 */
export function createApiRateLimitMiddleware(skipSuccessHeaders = false) {
  return (request: NextRequest) => 
    rateLimitMiddleware(request, { type: 'api', skipSuccessHeaders });
}

/**
 * Create rate limit middleware for vote routes
 */
export function createVoteRateLimitMiddleware(skipSuccessHeaders = false) {
  return (request: NextRequest) => 
    rateLimitMiddleware(request, { type: 'vote', skipSuccessHeaders });
}

/**
 * Apply rate limiting to API route handler
 */
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions = { type: 'api' }
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    
    // Check rate limit
    const rateLimitResult = await rateLimitMiddleware(request, options);
    if (rateLimitResult) {
      return rateLimitResult;
    }
    
    // Continue with original handler
    return handler(...args);
  };
}
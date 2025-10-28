import { NextResponse } from 'next/server';
import { logger } from './logger';

/**
 * Standardized rate limit response
 */
export function rateLimitResponse(
  remaining: number,
  reset: number,
  limit?: number
): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  
  const response = NextResponse.json(
    {
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter,
      remaining,
      reset,
      limit,
    },
    { status: 429 }
  );

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', limit?.toString() || '0');
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  response.headers.set('Retry-After', retryAfter.toString());

  logger.warn('Rate limit response sent', {
    remaining,
    reset,
    limit,
    retryAfter,
  });

  return response;
}

/**
 * Add rate limit headers to successful responses
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  
  return response;
}

/**
 * Extract client identifier from request
 * Priority: fingerprint hash > IP address
 */
export function getClientIdentifier(request: Request): {
  fingerprintHash?: string;
  ipAddress: string;
  identifier: string;
} {
  const headers = request.headers;
  
  // Try to get fingerprint hash from headers
  const fingerprintHash = headers.get('x-fingerprint-hash');
  
  // Get IP address from various headers
  const ipAddress = 
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    headers.get('x-client-ip') ||
    'unknown';

  // Use fingerprint hash as primary identifier, fallback to IP
  const identifier = fingerprintHash || ipAddress;

  const result: {
    fingerprintHash?: string;
    ipAddress: string;
    identifier: string;
  } = {
    ipAddress,
    identifier,
  };

  if (fingerprintHash) {
    result.fingerprintHash = fingerprintHash;
  }

  return result;
}

/**
 * Hash identifier for consistent key generation
 */
export async function hashIdentifier(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create error response with consistent format
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: any
): NextResponse {
  const response = {
    error: true,
    message,
    ...(details && { details }),
  };

  logger.error('API error response', { status, message, details });

  return NextResponse.json(response, { status });
}

/**
 * Create success response with consistent format
 */
export function successResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  const response = {
    success: true,
    ...(message && { message }),
    data,
  };

  return NextResponse.json(response, { status });
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
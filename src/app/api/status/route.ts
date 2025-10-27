import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '../../../lib/rate-limit';
import { successResponse, rateLimitResponse, getClientIdentifier, hashIdentifier, addRateLimitHeaders } from '../../../lib/api-utils';
import { testRedisConnection } from '../../../lib/redis';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Apply rate limiting
  const { identifier } = getClientIdentifier(request);
  const hashedIdentifier = await hashIdentifier(identifier);
  const rateLimitResult = await checkApiRateLimit(hashedIdentifier);
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.remaining, rateLimitResult.reset, rateLimitResult.limit);
  }
  
  // Test Redis connection
  const redisConnected = await testRedisConnection();
  
  // Create success response
  const response = successResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'unknown',
  });
  
  // Add rate limit headers
  return addRateLimitHeaders(response, rateLimitResult.limit, rateLimitResult.remaining, rateLimitResult.reset);
}
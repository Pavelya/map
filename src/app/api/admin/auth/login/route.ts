import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/services/auth-service';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW = 900; // 15 minutes in seconds
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Check rate limit for login attempts
 * @param identifier - IP address or username
 * @returns True if rate limit exceeded
 */
async function checkRateLimit(identifier: string): Promise<{ limited: boolean; remaining: number }> {
  const key = `login_attempts:${identifier}`;

  try {
    const current = await redis.get(key);
    const attempts = current ? parseInt(String(current), 10) : 0;

    if (attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      logger.warn('Rate limit exceeded for login', { identifier, attempts });
      return { limited: true, remaining: 0 };
    }

    // Increment attempts
    await redis.incr(key);

    // Set expiration on first attempt
    if (attempts === 0) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    return { limited: false, remaining: RATE_LIMIT_MAX_ATTEMPTS - attempts - 1 };
  } catch (error) {
    logger.error('Rate limit check failed', { error, identifier });
    // Fail open - allow request if Redis is down
    return { limited: false, remaining: RATE_LIMIT_MAX_ATTEMPTS };
  }
}

/**
 * Reset rate limit after successful login
 * @param identifier - IP address or username
 */
async function resetRateLimit(identifier: string): Promise<void> {
  const key = `login_attempts:${identifier}`;

  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Failed to reset rate limit', { error, identifier });
  }
}

/**
 * POST /api/admin/auth/login
 * Authenticate admin user and return JWT tokens
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      logger.warn('Login attempt with missing credentials');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get IP address for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit by IP
    const ipRateLimit = await checkRateLimit(`ip:${ip}`);
    if (ipRateLimit.limited) {
      logger.warn('Login rate limit exceeded by IP', { ip });
      return NextResponse.json(
        {
          error: 'Too many login attempts. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW,
        },
        { status: 429 }
      );
    }

    // Check rate limit by username
    const usernameRateLimit = await checkRateLimit(`username:${username}`);
    if (usernameRateLimit.limited) {
      logger.warn('Login rate limit exceeded by username', { username });
      return NextResponse.json(
        {
          error: 'Too many login attempts for this account. Please try again later.',
          retryAfter: RATE_LIMIT_WINDOW,
        },
        { status: 429 }
      );
    }

    // Authenticate admin
    try {
      const authResponse = await authenticateAdmin(username, password);

      // Reset rate limits on successful login
      await resetRateLimit(`ip:${ip}`);
      await resetRateLimit(`username:${username}`);

      logger.info('Admin login successful', {
        adminId: authResponse.admin.id,
        username: authResponse.admin.username,
        ip,
      });

      // Create response with tokens
      const response = NextResponse.json(
        {
          success: true,
          data: {
            admin: {
              id: authResponse.admin.id,
              username: authResponse.admin.username,
              email: authResponse.admin.email,
            },
            token: authResponse.accessToken,
          },
        },
        { status: 200 }
      );

      // Set HTTP-only cookie with refresh token
      response.cookies.set('refresh_token', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/api/admin/auth',
      });

      // Optionally set access token cookie (for cookie-based auth)
      response.cookies.set('access_token', authResponse.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour
        path: '/',
      });

      return response;
    } catch (authError) {
      // Authentication failed - don't reset rate limits
      logger.warn('Admin login failed', {
        username,
        ip,
        error: authError instanceof Error ? authError.message : 'Unknown error',
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    logger.error('Login endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth/login
 * Return method not allowed for GET requests
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

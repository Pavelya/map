import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Test API route called');
    logger.debug('Request details', { 
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    });

    return NextResponse.json({ 
      message: 'Setup validation successful!',
      timestamp: new Date().toISOString(),
      logger: 'Winston logger working',
      environment: process.env['NODE_ENV'] || 'development'
    });
  } catch (error) {
    logger.error('Test API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
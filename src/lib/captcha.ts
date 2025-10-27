import { logger } from './logger';

interface HCaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  credit?: boolean;
  'error-codes'?: string[];
  score?: number;
  score_reason?: string[];
}

/**
 * Verify hCaptcha token
 */
export async function verifyCaptcha(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env['HCAPTCHA_SECRET_KEY'];
  
  if (!secretKey) {
    logger.error('hCaptcha secret key not configured');
    return false;
  }

  try {
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });

    if (!response.ok) {
      logger.error('hCaptcha API request failed', {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    const data: HCaptchaResponse = await response.json();
    
    logger.info('hCaptcha verification result', {
      success: data.success,
      errorCodes: data['error-codes'],
      score: data.score
    });

    return data.success;
  } catch (error) {
    logger.error('hCaptcha verification error', { error });
    return false;
  }
}
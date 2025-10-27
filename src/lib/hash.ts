import crypto from 'crypto';

/**
 * Hash a fingerprint using SHA-256
 */
export function hashFingerprint(fingerprint: string): string {
  return crypto.createHash('sha256').update(fingerprint).digest('hex');
}

/**
 * Hash an IP address using SHA-256
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Hash a user agent string using SHA-256
 */
export function hashUserAgent(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}
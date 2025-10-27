import { NextRequest } from 'next/server';
import winston from 'winston';
import { LocationConsent } from '@/types/geo';

const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/all.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

const CONSENT_COOKIE_NAME = 'location_consent';
const CONSENT_HEADER_NAME = 'x-location-consent';

/**
 * Check location consent from request (cookie or header)
 */
export function checkLocationConsent(request: NextRequest): LocationConsent | null {
  try {
    // First check for consent in headers (for API requests)
    const consentHeader = request.headers.get(CONSENT_HEADER_NAME);
    if (consentHeader) {
      try {
        const consent = JSON.parse(consentHeader) as LocationConsent;
        
        logger.debug('Location consent found in header', {
          granted: consent.granted,
          precisionLevel: consent.precisionLevel,
          timestamp: consent.timestamp,
          operation: 'checkLocationConsent'
        });

        return consent;
      } catch (error) {
        logger.warn('Invalid consent header format', {
          header: consentHeader,
          error: error instanceof Error ? error.message : 'Parse error',
          operation: 'checkLocationConsent'
        });
      }
    }

    // Then check for consent in cookies (for browser requests)
    const consentCookie = request.cookies.get(CONSENT_COOKIE_NAME);
    if (consentCookie) {
      try {
        const consent = JSON.parse(consentCookie.value) as LocationConsent;
        
        logger.debug('Location consent found in cookie', {
          granted: consent.granted,
          precisionLevel: consent.precisionLevel,
          timestamp: consent.timestamp,
          operation: 'checkLocationConsent'
        });

        return consent;
      } catch (error) {
        logger.warn('Invalid consent cookie format', {
          cookie: consentCookie.value,
          error: error instanceof Error ? error.message : 'Parse error',
          operation: 'checkLocationConsent'
        });
      }
    }

    logger.debug('No location consent found in request', {
      hasHeader: !!consentHeader,
      hasCookie: !!consentCookie,
      operation: 'checkLocationConsent'
    });

    return null;
  } catch (error) {
    logger.error('Failed to check location consent', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'checkLocationConsent'
    });
    return null;
  }
}

/**
 * Get H3 resolution based on consent level
 */
export function getPrecisionLevel(consent: LocationConsent | null): {
  h3Resolution: number;
  precisionLevel: 'country' | 'city' | 'precise';
} {
  try {
    // If no consent or consent denied, use country-level precision
    if (!consent || !consent.granted) {
      logger.debug('No consent or consent denied, using country-level precision', {
        hasConsent: !!consent,
        granted: consent?.granted,
        operation: 'getPrecisionLevel'
      });

      return {
        h3Resolution: 5,
        precisionLevel: 'country'
      };
    }

    // Check if consent is expired (older than 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (consent.timestamp < thirtyDaysAgo) {
      logger.debug('Consent expired, using country-level precision', {
        consentTimestamp: consent.timestamp,
        thirtyDaysAgo,
        operation: 'getPrecisionLevel'
      });

      return {
        h3Resolution: 5,
        precisionLevel: 'country'
      };
    }

    // Use the precision level from consent
    let h3Resolution: number;
    let precisionLevel: 'country' | 'city' | 'precise';

    switch (consent.precisionLevel) {
      case 'precise':
        h3Resolution = 9; // ~174m resolution
        precisionLevel = 'precise';
        break;
      case 'city':
        h3Resolution = 7; // ~1.22km resolution
        precisionLevel = 'city';
        break;
      case 'country':
      default:
        h3Resolution = 5; // ~122km resolution
        precisionLevel = 'country';
        break;
    }

    logger.debug('Precision level determined from consent', {
      consentLevel: consent.precisionLevel,
      h3Resolution,
      precisionLevel,
      operation: 'getPrecisionLevel'
    });

    return { h3Resolution, precisionLevel };
  } catch (error) {
    logger.error('Failed to determine precision level', {
      consent,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getPrecisionLevel'
    });

    // Default to country-level on error
    return {
      h3Resolution: 5,
      precisionLevel: 'country'
    };
  }
}

/**
 * Validate consent object structure
 */
export function isValidConsent(consent: any): consent is LocationConsent {
  try {
    return (
      typeof consent === 'object' &&
      consent !== null &&
      typeof consent.granted === 'boolean' &&
      typeof consent.timestamp === 'number' &&
      typeof consent.precisionLevel === 'string' &&
      ['country', 'city', 'precise'].includes(consent.precisionLevel)
    );
  } catch {
    return false;
  }
}

/**
 * Create a consent object
 */
export function createLocationConsent(
  granted: boolean,
  precisionLevel: 'country' | 'city' | 'precise' = 'country'
): LocationConsent {
  const consent: LocationConsent = {
    granted,
    timestamp: Date.now(),
    precisionLevel
  };

  logger.debug('Created location consent', {
    granted,
    precisionLevel,
    timestamp: consent.timestamp,
    operation: 'createLocationConsent'
  });

  return consent;
}

/**
 * Serialize consent for storage (cookie/header)
 */
export function serializeConsent(consent: LocationConsent): string {
  try {
    return JSON.stringify(consent);
  } catch (error) {
    logger.error('Failed to serialize consent', {
      consent,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'serializeConsent'
    });
    throw error;
  }
}

/**
 * Parse consent from string
 */
export function parseConsent(consentString: string): LocationConsent | null {
  try {
    const parsed = JSON.parse(consentString);
    
    if (!isValidConsent(parsed)) {
      logger.warn('Invalid consent structure', {
        consentString,
        operation: 'parseConsent'
      });
      return null;
    }

    return parsed;
  } catch (error) {
    logger.error('Failed to parse consent', {
      consentString,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'parseConsent'
    });
    return null;
  }
}

/**
 * Check if consent needs renewal (older than 30 days)
 */
export function needsConsentRenewal(consent: LocationConsent): boolean {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const needsRenewal = consent.timestamp < thirtyDaysAgo;

    logger.debug('Consent renewal check', {
      consentTimestamp: consent.timestamp,
      thirtyDaysAgo,
      needsRenewal,
      operation: 'needsConsentRenewal'
    });

    return needsRenewal;
  } catch (error) {
    logger.error('Failed to check consent renewal', {
      consent,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'needsConsentRenewal'
    });
    return true; // Assume renewal needed on error
  }
}
import { NextRequest } from 'next/server';
import winston from 'winston';
import { GeoLocation, BrowserCoordinates } from '@/types/geo';
import { getLocationFromIP, isPrivateIP } from '@/lib/geo/ip-geolocation';
import { checkLocationConsent, getPrecisionLevel } from '@/lib/geo/consent';
import { latLngToH3 } from '@/lib/geo/h3-utils';
import { validateCoordinates } from '@/lib/geo/validation';

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

/**
 * Extract IP address from request
 */
function getClientIP(request: NextRequest): string {
  try {
    // Check various headers for the real IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    // Priority: Cloudflare > X-Real-IP > X-Forwarded-For > Remote Address
    let ip = cfConnectingIP || realIP || forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
    
    // Handle IPv6 localhost
    if (ip === '::1') {
      ip = '127.0.0.1';
    }

    logger.debug('Extracted client IP', {
      ip,
      forwardedFor,
      realIP,
      cfConnectingIP,
      operation: 'getClientIP'
    });

    return ip;
  } catch (error) {
    logger.error('Failed to extract client IP', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getClientIP'
    });
    return '127.0.0.1';
  }
}

/**
 * Get location from request (browser geolocation or IP fallback)
 */
export async function getLocationFromRequest(request: NextRequest): Promise<GeoLocation> {
  try {
    const clientIP = getClientIP(request);
    const consent = checkLocationConsent(request);
    const { h3Resolution, precisionLevel } = getPrecisionLevel(consent);

    logger.info('Processing location request', {
      clientIP,
      hasConsent: !!consent,
      consentGranted: consent?.granted,
      precisionLevel,
      h3Resolution,
      operation: 'getLocationFromRequest'
    });

    // Check for browser coordinates in request body or headers
    const browserCoords = await getBrowserLocationFromRequest(request);
    
    if (browserCoords) {
      logger.info('Using browser geolocation', {
        latitude: browserCoords.latitude,
        longitude: browserCoords.longitude,
        accuracy: browserCoords.accuracy,
        operation: 'getLocationFromRequest'
      });

      return await getBrowserLocation(browserCoords, h3Resolution);
    }

    // Fallback to IP geolocation
    logger.info('Falling back to IP geolocation', {
      clientIP,
      operation: 'getLocationFromRequest'
    });

    return await getIPLocation(clientIP, h3Resolution);
  } catch (error) {
    logger.error('Failed to get location from request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getLocationFromRequest'
    });

    // Return default location on error
    return {
      latitude: 0,
      longitude: 0,
      h3Index: latLngToH3(0, 0, 5),
      h3Resolution: 5,
      countryCode: 'XX',
      city: 'Unknown',
      accuracy: 100000,
      source: 'ip'
    };
  }
}

/**
 * Extract browser coordinates from request
 */
async function getBrowserLocationFromRequest(request: NextRequest): Promise<BrowserCoordinates | null> {
  try {
    // Check for coordinates in headers (for API requests)
    const latHeader = request.headers.get('x-latitude');
    const lngHeader = request.headers.get('x-longitude');
    const accuracyHeader = request.headers.get('x-accuracy');

    if (latHeader && lngHeader) {
      const latitude = parseFloat(latHeader);
      const longitude = parseFloat(lngHeader);
      const accuracy = accuracyHeader ? parseFloat(accuracyHeader) : 1000;

      const validation = validateCoordinates(latitude, longitude);
      if (validation.valid) {
        logger.debug('Browser coordinates found in headers', {
          latitude,
          longitude,
          accuracy,
          operation: 'getBrowserLocationFromRequest'
        });

        return { latitude, longitude, accuracy };
      }
    }

    // Check for coordinates in request body (for POST requests)
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.location && typeof body.location === 'object') {
          const { latitude, longitude, accuracy = 1000 } = body.location;
          
          if (typeof latitude === 'number' && typeof longitude === 'number') {
            const validation = validateCoordinates(latitude, longitude);
            if (validation.valid) {
              logger.debug('Browser coordinates found in request body', {
                latitude,
                longitude,
                accuracy,
                operation: 'getBrowserLocationFromRequest'
              });

              return { latitude, longitude, accuracy };
            }
          }
        }
      } catch {
        // Not JSON or no location data
      }
    }

    logger.debug('No browser coordinates found in request', {
      hasLatHeader: !!latHeader,
      hasLngHeader: !!lngHeader,
      method: request.method,
      operation: 'getBrowserLocationFromRequest'
    });

    return null;
  } catch (error) {
    logger.error('Failed to extract browser coordinates from request', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getBrowserLocationFromRequest'
    });
    return null;
  }
}

/**
 * Convert browser coordinates to GeoLocation
 */
export async function getBrowserLocation(coords: BrowserCoordinates, h3Resolution: number = 7): Promise<GeoLocation> {
  try {
    const validation = validateCoordinates(coords.latitude, coords.longitude);
    if (!validation.valid) {
      throw new Error(`Invalid coordinates: ${validation.error}`);
    }

    const h3Index = latLngToH3(coords.latitude, coords.longitude, h3Resolution);

    const geoLocation: GeoLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      h3Index,
      h3Resolution,
      accuracy: coords.accuracy,
      source: 'browser_geo'
    };

    logger.info('Browser location processed', {
      latitude: coords.latitude,
      longitude: coords.longitude,
      h3Index,
      h3Resolution,
      accuracy: coords.accuracy,
      operation: 'getBrowserLocation'
    });

    return geoLocation;
  } catch (error) {
    logger.error('Failed to process browser location', {
      coords,
      h3Resolution,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getBrowserLocation'
    });
    throw error;
  }
}

/**
 * Get location from IP address
 */
export async function getIPLocation(ip: string, h3Resolution: number = 5): Promise<GeoLocation> {
  try {
    const ipGeoResult = await getLocationFromIP(ip);

    // If we have coordinates, use them
    if (ipGeoResult.latitude && ipGeoResult.longitude) {
      const h3Index = latLngToH3(ipGeoResult.latitude, ipGeoResult.longitude, h3Resolution);

      const geoLocation: GeoLocation = {
        latitude: ipGeoResult.latitude,
        longitude: ipGeoResult.longitude,
        h3Index,
        h3Resolution,
        countryCode: ipGeoResult.countryCode || undefined,
        city: ipGeoResult.city || undefined,
        accuracy: ipGeoResult.accuracy,
        source: 'ip'
      };

      logger.info('IP location processed with coordinates', {
        ip,
        latitude: ipGeoResult.latitude,
        longitude: ipGeoResult.longitude,
        countryCode: ipGeoResult.countryCode,
        city: ipGeoResult.city,
        h3Index,
        h3Resolution,
        accuracy: ipGeoResult.accuracy,
        operation: 'getIPLocation'
      });

      return geoLocation;
    }

    // If no coordinates, return a default location with country info
    const defaultLat = 0;
    const defaultLng = 0;
    const h3Index = latLngToH3(defaultLat, defaultLng, h3Resolution);

    const geoLocation: GeoLocation = {
      latitude: defaultLat,
      longitude: defaultLng,
      h3Index,
      h3Resolution,
      countryCode: ipGeoResult.countryCode || 'XX',
      city: ipGeoResult.city || 'Unknown',
      accuracy: ipGeoResult.accuracy,
      source: 'ip'
    };

    logger.info('IP location processed without coordinates', {
      ip,
      countryCode: ipGeoResult.countryCode,
      city: ipGeoResult.city,
      h3Index,
      h3Resolution,
      accuracy: ipGeoResult.accuracy,
      operation: 'getIPLocation'
    });

    return geoLocation;
  } catch (error) {
    logger.error('Failed to get IP location', {
      ip,
      h3Resolution,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getIPLocation'
    });

    // Return default location on error
    const h3Index = latLngToH3(0, 0, h3Resolution);
    return {
      latitude: 0,
      longitude: 0,
      h3Index,
      h3Resolution,
      countryCode: 'XX',
      city: 'Unknown',
      accuracy: 100000,
      source: 'ip'
    };
  }
}

/**
 * Enrich vote data with complete location information
 */
export async function enrichVoteWithLocation(
  vote: any,
  request: NextRequest
): Promise<any> {
  try {
    const location = await getLocationFromRequest(request);

    const enrichedVote = {
      ...vote,
      latitude: location.latitude,
      longitude: location.longitude,
      h3_index: location.h3Index,
      h3_resolution: location.h3Resolution,
      country_code: location.countryCode,
      city: location.city,
      location_accuracy: location.accuracy,
      location_source: location.source
    };

    logger.info('Vote enriched with location data', {
      voteId: vote.id,
      source: location.source,
      hasCoordinates: !!(location.latitude && location.longitude),
      h3Resolution: location.h3Resolution,
      countryCode: location.countryCode,
      operation: 'enrichVoteWithLocation'
    });

    return enrichedVote;
  } catch (error) {
    logger.error('Failed to enrich vote with location', {
      voteId: vote.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'enrichVoteWithLocation'
    });

    // Return vote with minimal location data on error
    return {
      ...vote,
      latitude: 0,
      longitude: 0,
      h3_index: latLngToH3(0, 0, 5),
      h3_resolution: 5,
      country_code: 'XX',
      city: 'Unknown',
      location_accuracy: 100000,
      location_source: 'ip'
    };
  }
}

/**
 * Detect potential location fraud (GPS spoofing, VPN, proxy)
 */
export async function detectLocationFraud(location: GeoLocation, request: NextRequest): Promise<{
  isFraudulent: boolean;
  reasons: string[];
  riskScore: number; // 0-100, higher = more suspicious
}> {
  try {
    const reasons: string[] = [];
    let riskScore = 0;

    const clientIP = getClientIP(request);

    // Check if IP is private (shouldn't happen in production)
    if (isPrivateIP(clientIP)) {
      reasons.push('Private IP address detected');
      riskScore += 20;
    }

    // Check for impossible accuracy (too precise for the source)
    if (location.source === 'ip' && location.accuracy < 1000) {
      reasons.push('Impossibly high accuracy for IP geolocation');
      riskScore += 30;
    }

    // Check for coordinates at exactly 0,0 (null island)
    if (location.latitude === 0 && location.longitude === 0) {
      reasons.push('Coordinates at null island (0,0)');
      riskScore += 15;
    }

    // Check for browser geolocation with suspiciously low accuracy
    if (location.source === 'browser_geo' && location.accuracy > 50000) {
      reasons.push('Browser geolocation with very low accuracy');
      riskScore += 10;
    }

    // Check for rapid location changes (would need session tracking)
    // This is a placeholder for more sophisticated fraud detection

    // Additional checks could include:
    // - VPN/proxy detection services
    // - Comparison with IP geolocation
    // - Time zone consistency
    // - Device fingerprinting

    const isFraudulent = riskScore >= 50; // Threshold for fraud detection

    logger.info('Location fraud detection completed', {
      clientIP,
      location: {
        source: location.source,
        accuracy: location.accuracy,
        coordinates: [location.latitude, location.longitude]
      },
      isFraudulent,
      riskScore,
      reasonCount: reasons.length,
      operation: 'detectLocationFraud'
    });

    return {
      isFraudulent,
      reasons,
      riskScore
    };
  } catch (error) {
    logger.error('Location fraud detection failed', {
      location,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'detectLocationFraud'
    });

    // Return safe defaults on error
    return {
      isFraudulent: false,
      reasons: ['Fraud detection failed'],
      riskScore: 0
    };
  }
}
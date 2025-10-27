import { Reader } from 'maxmind';
import { promises as fs } from 'fs';
import path from 'path';
import winston from 'winston';
import { IPGeolocationResult } from '@/types/geo';

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

let maxmindReader: Reader<any> | null = null;
const MAXMIND_DB_PATH = path.join(process.cwd(), 'data', 'GeoLite2-City.mmdb');

/**
 * Initialize MaxMind database reader
 */
async function initMaxMindReader(): Promise<Reader<any> | null> {
  try {
    if (maxmindReader) {
      return maxmindReader;
    }

    // Check if MaxMind database file exists
    try {
      await fs.access(MAXMIND_DB_PATH);
    } catch {
      logger.warn('MaxMind database not found', {
        path: MAXMIND_DB_PATH,
        operation: 'initMaxMindReader'
      });
      return null;
    }

    const buffer = await fs.readFile(MAXMIND_DB_PATH);
    maxmindReader = new Reader(buffer);

    logger.info('MaxMind database initialized', {
      path: MAXMIND_DB_PATH,
      operation: 'initMaxMindReader'
    });

    return maxmindReader;
  } catch (error) {
    logger.error('Failed to initialize MaxMind database', {
      path: MAXMIND_DB_PATH,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'initMaxMindReader'
    });
    return null;
  }
}

/**
 * Get location from IP using MaxMind database
 */
async function getLocationFromMaxMind(ip: string): Promise<IPGeolocationResult | null> {
  try {
    const reader = await initMaxMindReader();
    if (!reader) {
      return null;
    }

    const result = reader.get(ip);
    if (!result) {
      logger.debug('No MaxMind data found for IP', {
        ip,
        operation: 'getLocationFromMaxMind'
      });
      return null;
    }

    const location = result.location || {};
    const country = result.country || {};
    const city = result.city || {};

    const geoResult: IPGeolocationResult = {
      countryCode: country.iso_code,
      city: city.names?.en,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy_radius || 1000 // Default to 1km accuracy
    };

    logger.debug('MaxMind geolocation successful', {
      ip,
      countryCode: geoResult.countryCode,
      city: geoResult.city,
      hasCoordinates: !!(geoResult.latitude && geoResult.longitude),
      accuracy: geoResult.accuracy,
      operation: 'getLocationFromMaxMind'
    });

    return geoResult;
  } catch (error) {
    logger.error('MaxMind geolocation failed', {
      ip,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getLocationFromMaxMind'
    });
    return null;
  }
}

/**
 * Get location from IP using Cloudflare API
 */
async function getLocationFromCloudflare(ip: string): Promise<IPGeolocationResult | null> {
  try {
    const apiToken = process.env['CLOUDFLARE_API_TOKEN'];
    if (!apiToken) {
      logger.debug('Cloudflare API token not configured', {
        operation: 'getLocationFromCloudflare'
      });
      return null;
    }

    const response = await fetch(`https://api.cloudflare.com/client/v4/ips/${ip}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.result) {
      logger.debug('No Cloudflare data found for IP', {
        ip,
        operation: 'getLocationFromCloudflare'
      });
      return null;
    }

    const result = data.result;
    const geoResult: IPGeolocationResult = {
      countryCode: result.country,
      city: result.city,
      latitude: result.latitude,
      longitude: result.longitude,
      accuracy: 10000 // Cloudflare typically provides city-level accuracy (~10km)
    };

    logger.debug('Cloudflare geolocation successful', {
      ip,
      countryCode: geoResult.countryCode,
      city: geoResult.city,
      hasCoordinates: !!(geoResult.latitude && geoResult.longitude),
      accuracy: geoResult.accuracy,
      operation: 'getLocationFromCloudflare'
    });

    return geoResult;
  } catch (error) {
    logger.error('Cloudflare geolocation failed', {
      ip,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getLocationFromCloudflare'
    });
    return null;
  }
}

/**
 * Check if IP address is private/local
 */
export function isPrivateIP(ip: string): boolean {
  try {
    // IPv4 private ranges
    const ipv4PrivateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (loopback)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
    ];

    // IPv6 private ranges
    const ipv6PrivateRanges = [
      /^::1$/,                    // ::1 (loopback)
      /^fe80:/,                   // fe80::/10 (link-local)
      /^fc00:/,                   // fc00::/7 (unique local)
      /^fd00:/,                   // fd00::/8 (unique local)
    ];

    const isPrivate = [...ipv4PrivateRanges, ...ipv6PrivateRanges].some(range => range.test(ip));

    logger.debug('IP privacy check', {
      ip,
      isPrivate,
      operation: 'isPrivateIP'
    });

    return isPrivate;
  } catch (error) {
    logger.error('IP privacy check failed', {
      ip,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'isPrivateIP'
    });
    return true; // Assume private if we can't determine
  }
}

/**
 * Get location from IP address using available services
 */
export async function getLocationFromIP(ip: string): Promise<IPGeolocationResult> {
  try {
    // Check if IP is private/local
    if (isPrivateIP(ip)) {
      logger.debug('Private IP detected, returning default location', {
        ip,
        operation: 'getLocationFromIP'
      });
      
      return {
        countryCode: 'US', // Default to US for private IPs
        city: 'Unknown',
        accuracy: 50000 // Very low accuracy for private IPs
      };
    }

    // Try MaxMind first (more accurate)
    const maxmindResult = await getLocationFromMaxMind(ip);
    if (maxmindResult && maxmindResult.latitude && maxmindResult.longitude) {
      logger.info('IP geolocation successful via MaxMind', {
        ip,
        countryCode: maxmindResult.countryCode,
        city: maxmindResult.city,
        operation: 'getLocationFromIP'
      });
      return maxmindResult;
    }

    // Fallback to Cloudflare
    const cloudflareResult = await getLocationFromCloudflare(ip);
    if (cloudflareResult && cloudflareResult.latitude && cloudflareResult.longitude) {
      logger.info('IP geolocation successful via Cloudflare', {
        ip,
        countryCode: cloudflareResult.countryCode,
        city: cloudflareResult.city,
        operation: 'getLocationFromIP'
      });
      return cloudflareResult;
    }

    // If both services fail, return minimal data
    logger.warn('IP geolocation failed for all services', {
      ip,
      operation: 'getLocationFromIP'
    });

    return {
      countryCode: 'XX', // Unknown country
      city: 'Unknown',
      accuracy: 100000 // Very low accuracy
    };
  } catch (error) {
    logger.error('IP geolocation completely failed', {
      ip,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getLocationFromIP'
    });

    return {
      countryCode: 'XX',
      city: 'Unknown',
      accuracy: 100000
    };
  }
}

/**
 * Update MaxMind GeoLite2 database
 */
export async function updateGeoDatabase(): Promise<boolean> {
  try {
    const licenseKey = process.env['MAXMIND_LICENSE_KEY'];
    if (!licenseKey) {
      logger.warn('MaxMind license key not configured', {
        operation: 'updateGeoDatabase'
      });
      return false;
    }

    // Create data directory if it doesn't exist
    const dataDir = path.dirname(MAXMIND_DB_PATH);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Download the database
    const downloadUrl = `https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${licenseKey}&suffix=tar.gz`;
    
    logger.info('Starting MaxMind database download', {
      operation: 'updateGeoDatabase'
    });

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    // For now, we'll just log that the download would happen
    // In a real implementation, you'd extract the tar.gz and move the .mmdb file
    logger.info('MaxMind database download completed (placeholder)', {
      operation: 'updateGeoDatabase'
    });

    // Reset the reader to force reinitialization
    maxmindReader = null;

    return true;
  } catch (error) {
    logger.error('Failed to update MaxMind database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'updateGeoDatabase'
    });
    return false;
  }
}
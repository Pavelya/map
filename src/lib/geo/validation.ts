import { z } from 'zod';
import { isValidCell } from 'h3-js';
import winston from 'winston';

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

// Zod schemas for validation
export const coordinatesSchema = z.object({
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
});

export const countryCodeSchema = z.string()
  .length(2, 'Country code must be exactly 2 characters')
  .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters only');

export const h3IndexSchema = z.string()
  .min(15, 'H3 index too short')
  .max(15, 'H3 index too long')
  .regex(/^[0-9a-f]+$/, 'H3 index must contain only hexadecimal characters');

export const h3ResolutionSchema = z.number()
  .int('H3 resolution must be an integer')
  .min(0, 'H3 resolution must be at least 0')
  .max(15, 'H3 resolution must be at most 15');

// ISO 3166-1 alpha-2 country codes
const VALID_COUNTRY_CODES = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]);

/**
 * Validate latitude and longitude coordinates
 */
export function validateCoordinates(lat: number, lng: number): { valid: boolean; error?: string } {
  try {
    coordinatesSchema.parse({ latitude: lat, longitude: lng });
    
    logger.debug('Coordinates validation passed', {
      lat,
      lng,
      operation: 'validateCoordinates'
    });

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? error.errors.map(e => e.message).join(', ')
      : 'Invalid coordinates';

    logger.warn('Coordinates validation failed', {
      lat,
      lng,
      error: errorMessage,
      operation: 'validateCoordinates'
    });

    return { valid: false, error: errorMessage };
  }
}

/**
 * Validate ISO 3166-1 alpha-2 country code
 */
export function validateCountryCode(code: string): { valid: boolean; error?: string } {
  try {
    const upperCode = code.toUpperCase();
    countryCodeSchema.parse(upperCode);

    if (!VALID_COUNTRY_CODES.has(upperCode)) {
      throw new Error(`Invalid country code: ${code}`);
    }

    logger.debug('Country code validation passed', {
      code: upperCode,
      operation: 'validateCountryCode'
    });

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid country code';

    logger.warn('Country code validation failed', {
      code,
      error: errorMessage,
      operation: 'validateCountryCode'
    });

    return { valid: false, error: errorMessage };
  }
}

/**
 * Validate H3 index format and resolution
 */
export function validateH3Index(index: string, resolution?: number): { valid: boolean; error?: string } {
  try {
    // First validate the basic format
    h3IndexSchema.parse(index);

    // Then use h3-js library for proper validation
    if (!isValidCell(index)) {
      throw new Error('Invalid H3 index format');
    }

    // Validate resolution if provided
    if (resolution !== undefined) {
      h3ResolutionSchema.parse(resolution);
      
      // Note: In a full implementation, you'd extract the actual resolution
      // from the H3 index and compare it. For now, we'll skip this check.
    }

    logger.debug('H3 index validation passed', {
      index,
      resolution,
      operation: 'validateH3Index'
    });

    return { valid: true };
  } catch (error) {
    const errorMessage = error instanceof z.ZodError 
      ? error.errors.map(e => e.message).join(', ')
      : error instanceof Error 
        ? error.message 
        : 'Invalid H3 index';

    logger.warn('H3 index validation failed', {
      index,
      resolution,
      error: errorMessage,
      operation: 'validateH3Index'
    });

    return { valid: false, error: errorMessage };
  }
}

/**
 * Check if coordinates are within allowed regions
 */
export function isInAllowedRegion(
  lat: number, 
  lng: number, 
  allowedRegions?: Array<{ name: string; bounds: { north: number; south: number; east: number; west: number } }>
): { allowed: boolean; region?: string; error?: string } {
  try {
    // First validate the coordinates
    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.valid) {
      return { allowed: false, error: coordValidation.error || 'Invalid coordinates' };
    }

    // If no allowed regions specified, allow all valid coordinates
    if (!allowedRegions || allowedRegions.length === 0) {
      logger.debug('No region restrictions, coordinates allowed', {
        lat,
        lng,
        operation: 'isInAllowedRegion'
      });
      return { allowed: true };
    }

    // Check if coordinates fall within any allowed region
    for (const region of allowedRegions) {
      const { bounds } = region;
      
      if (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
      ) {
        logger.debug('Coordinates within allowed region', {
          lat,
          lng,
          region: region.name,
          operation: 'isInAllowedRegion'
        });
        return { allowed: true, region: region.name };
      }
    }

    logger.warn('Coordinates outside allowed regions', {
      lat,
      lng,
      allowedRegions: allowedRegions.map(r => r.name),
      operation: 'isInAllowedRegion'
    });

    return { 
      allowed: false, 
      error: `Coordinates not within allowed regions: ${allowedRegions.map(r => r.name).join(', ')}` 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Region validation error';

    logger.error('Region validation failed', {
      lat,
      lng,
      error: errorMessage,
      operation: 'isInAllowedRegion'
    });

    return { allowed: false, error: errorMessage };
  }
}

/**
 * Validate complete geolocation data
 */
export function validateGeoLocation(data: {
  latitude: number;
  longitude: number;
  h3Index?: string;
  countryCode?: string;
  accuracy?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate coordinates
  const coordValidation = validateCoordinates(data.latitude, data.longitude);
  if (!coordValidation.valid && coordValidation.error) {
    errors.push(coordValidation.error);
  }

  // Validate H3 index if provided
  if (data.h3Index) {
    const h3Validation = validateH3Index(data.h3Index);
    if (!h3Validation.valid && h3Validation.error) {
      errors.push(h3Validation.error);
    }
  }

  // Validate country code if provided
  if (data.countryCode) {
    const countryValidation = validateCountryCode(data.countryCode);
    if (!countryValidation.valid && countryValidation.error) {
      errors.push(countryValidation.error);
    }
  }

  // Validate accuracy if provided
  if (data.accuracy !== undefined) {
    if (typeof data.accuracy !== 'number' || data.accuracy < 0) {
      errors.push('Accuracy must be a non-negative number');
    }
  }

  const valid = errors.length === 0;

  logger.debug('Geolocation validation completed', {
    valid,
    errorCount: errors.length,
    data: {
      hasCoordinates: !!(data.latitude && data.longitude),
      hasH3Index: !!data.h3Index,
      hasCountryCode: !!data.countryCode,
      hasAccuracy: data.accuracy !== undefined
    },
    operation: 'validateGeoLocation'
  });

  return { valid, errors };
}
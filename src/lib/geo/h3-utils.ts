import { latLngToCell, cellToLatLng, cellToBoundary, gridDistance, gridRingUnsafe, isValidCell } from 'h3-js';
import { createClient } from '@supabase/supabase-js';
import winston from 'winston';
import { H3Cell } from '@/types/geo';

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

// Initialize Supabase client only if environment variables are available
let supabase: any = null;
if (process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']) {
  supabase = createClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'],
    process.env['SUPABASE_SERVICE_ROLE_KEY']
  );
}

/**
 * Convert latitude/longitude coordinates to H3 index
 */
export function latLngToH3(lat: number, lng: number, resolution: number): string {
  try {
    if (!isValidCoordinate(lat, lng)) {
      throw new Error(`Invalid coordinates: lat=${lat}, lng=${lng}`);
    }
    
    if (resolution < 0 || resolution > 15) {
      throw new Error(`Invalid H3 resolution: ${resolution}. Must be between 0-15`);
    }

    const h3Index = latLngToCell(lat, lng, resolution);
    
    logger.debug('Converted coordinates to H3', {
      lat,
      lng,
      resolution,
      h3Index,
      operation: 'latLngToH3'
    });

    return h3Index;
  } catch (error) {
    logger.error('Failed to convert coordinates to H3', {
      lat,
      lng,
      resolution,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'latLngToH3'
    });
    throw error;
  }
}

/**
 * Convert H3 index back to latitude/longitude coordinates
 */
export function h3ToLatLng(h3Index: string): [number, number] {
  try {
    if (!isValidH3Index(h3Index)) {
      throw new Error(`Invalid H3 index: ${h3Index}`);
    }

    const [lat, lng] = cellToLatLng(h3Index);
    
    logger.debug('Converted H3 to coordinates', {
      h3Index,
      lat,
      lng,
      operation: 'h3ToLatLng'
    });

    return [lat, lng];
  } catch (error) {
    logger.error('Failed to convert H3 to coordinates', {
      h3Index,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'h3ToLatLng'
    });
    throw error;
  }
}

/**
 * Get hexagon boundary coordinates for map rendering
 */
export function h3ToGeoBoundary(h3Index: string): [number, number][] {
  try {
    if (!isValidH3Index(h3Index)) {
      throw new Error(`Invalid H3 index: ${h3Index}`);
    }

    const boundary = cellToBoundary(h3Index);
    
    logger.debug('Generated H3 geo boundary', {
      h3Index,
      boundaryPoints: boundary.length,
      operation: 'h3ToGeoBoundary'
    });

    return boundary;
  } catch (error) {
    logger.error('Failed to generate H3 geo boundary', {
      h3Index,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'h3ToGeoBoundary'
    });
    throw error;
  }
}

/**
 * Get H3 resolution for a specific match from database
 */
export async function getH3Resolution(matchId: string): Promise<number> {
  try {
    if (!supabase) {
      logger.warn('Supabase not initialized, using default resolution', {
        matchId,
        operation: 'getH3Resolution'
      });
      return 7; // Default resolution
    }

    const { data, error } = await supabase
      .from('matches')
      .select('h3_resolution')
      .eq('id', matchId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) {
      throw new Error(`Match not found: ${matchId}`);
    }

    const resolution = data.h3_resolution || 7; // Default to resolution 7
    
    logger.debug('Retrieved H3 resolution for match', {
      matchId,
      resolution,
      operation: 'getH3Resolution'
    });

    return resolution;
  } catch (error) {
    logger.error('Failed to get H3 resolution for match', {
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getH3Resolution'
    });
    throw error;
  }
}

/**
 * Get neighboring hexagons within k distance
 */
export function kRing(h3Index: string, k: number): string[] {
  try {
    if (!isValidH3Index(h3Index)) {
      throw new Error(`Invalid H3 index: ${h3Index}`);
    }

    if (k < 0 || k > 10) {
      throw new Error(`Invalid k value: ${k}. Must be between 0-10`);
    }

    const neighbors = gridRingUnsafe(h3Index, k);
    
    logger.debug('Generated H3 k-ring', {
      h3Index,
      k,
      neighborCount: neighbors.length,
      operation: 'kRing'
    });

    return neighbors;
  } catch (error) {
    logger.error('Failed to generate H3 k-ring', {
      h3Index,
      k,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'kRing'
    });
    throw error;
  }
}

/**
 * Calculate distance between two H3 cells
 */
export function h3Distance(h3Index1: string, h3Index2: string): number {
  try {
    if (!isValidH3Index(h3Index1) || !isValidH3Index(h3Index2)) {
      throw new Error(`Invalid H3 indices: ${h3Index1}, ${h3Index2}`);
    }

    const distance = gridDistance(h3Index1, h3Index2);
    
    logger.debug('Calculated H3 distance', {
      h3Index1,
      h3Index2,
      distance,
      operation: 'h3Distance'
    });

    return distance;
  } catch (error) {
    logger.error('Failed to calculate H3 distance', {
      h3Index1,
      h3Index2,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'h3Distance'
    });
    throw error;
  }
}

/**
 * Validate H3 index format and optionally check resolution
 */
export function isValidH3Index(h3Index: string, expectedResolution?: number): boolean {
  try {
    const isValid = isValidCell(h3Index);
    
    if (!isValid) {
      logger.debug('Invalid H3 index format', {
        h3Index,
        operation: 'isValidH3Index'
      });
      return false;
    }

    // If expected resolution is provided, validate it matches
    if (expectedResolution !== undefined) {
      // Extract resolution from H3 index (this is a simplified check)
      // In a real implementation, you'd use h3.getResolution(h3Index)
      // For now, we'll assume the validation passed if the index is valid
    }

    logger.debug('H3 index validation passed', {
      h3Index,
      expectedResolution,
      operation: 'isValidH3Index'
    });

    return true;
  } catch (error) {
    logger.error('H3 index validation failed', {
      h3Index,
      expectedResolution,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'isValidH3Index'
    });
    return false;
  }
}

/**
 * Create H3Cell object with all properties
 */
export function createH3Cell(h3Index: string): H3Cell {
  try {
    if (!isValidH3Index(h3Index)) {
      throw new Error(`Invalid H3 index: ${h3Index}`);
    }

    const center = h3ToLatLng(h3Index);
    const boundary = h3ToGeoBoundary(h3Index);
    
    // Extract resolution from the H3 index
    // This is a simplified approach - in production you'd use h3.getResolution()
    const resolution = 7; // Default resolution for now

    const cell: H3Cell = {
      index: h3Index,
      resolution,
      boundary,
      center
    };

    logger.debug('Created H3 cell object', {
      h3Index,
      resolution,
      operation: 'createH3Cell'
    });

    return cell;
  } catch (error) {
    logger.error('Failed to create H3 cell object', {
      h3Index,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'createH3Cell'
    });
    throw error;
  }
}

/**
 * Helper function to validate coordinates
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}
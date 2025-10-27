// Winston not used in browser-side code
import { BrowserCoordinates, GeolocationError } from '@/types/geo';

// Client-side logger (simplified for browser)
const logger = {
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[GEO] ${message}`, data);
    }
  },
  warn: (message: string, data?: any) => {
    console.warn(`[GEO] ${message}`, data);
  },
  error: (message: string, data?: any) => {
    console.error(`[GEO] ${message}`, data);
  },
  info: (message: string, data?: any) => {
    console.info(`[GEO] ${message}`, data);
  }
};

const CACHE_KEY = 'browser_geolocation_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedLocation {
  coordinates: BrowserCoordinates;
  timestamp: number;
}

/**
 * Get cached browser location if still valid
 */
function getCachedLocation(): BrowserCoordinates | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsedCache: CachedLocation = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (within 5 minutes)
    if (now - parsedCache.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      logger.debug('Cached location expired', {
        cachedTimestamp: parsedCache.timestamp,
        now,
        operation: 'getCachedLocation'
      });
      return null;
    }

    logger.debug('Using cached browser location', {
      coordinates: parsedCache.coordinates,
      cacheAge: now - parsedCache.timestamp,
      operation: 'getCachedLocation'
    });

    return parsedCache.coordinates;
  } catch (error) {
    logger.error('Failed to get cached location', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getCachedLocation'
    });
    
    // Clear invalid cache
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {
      // Ignore cleanup errors
    }
    
    return null;
  }
}

/**
 * Cache browser location
 */
function setCachedLocation(coordinates: BrowserCoordinates): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const cacheData: CachedLocation = {
      coordinates,
      timestamp: Date.now()
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

    logger.debug('Cached browser location', {
      coordinates,
      timestamp: cacheData.timestamp,
      operation: 'setCachedLocation'
    });
  } catch (error) {
    logger.error('Failed to cache location', {
      coordinates,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'setCachedLocation'
    });
  }
}

/**
 * Check if geolocation is supported
 */
export function isGeolocationSupported(): boolean {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  
  logger.debug('Geolocation support check', {
    supported,
    hasNavigator: typeof navigator !== 'undefined',
    hasGeolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    operation: 'isGeolocationSupported'
  });

  return supported;
}

/**
 * Get browser location using Geolocation API
 */
export async function getBrowserLocation(options?: {
  useCache?: boolean;
  timeout?: number;
  enableHighAccuracy?: boolean;
}): Promise<BrowserCoordinates> {
  const {
    useCache = true,
    timeout = 10000, // 10 seconds
    enableHighAccuracy = true
  } = options || {};

  try {
    // Check cache first if enabled
    if (useCache) {
      const cached = getCachedLocation();
      if (cached) {
        return cached;
      }
    }

    // Check if geolocation is supported
    if (!isGeolocationSupported()) {
      const error: GeolocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not supported by this browser'
      };
      
      logger.error('Geolocation not supported', {
        operation: 'getBrowserLocation'
      });
      
      throw error;
    }

    logger.info('Requesting browser geolocation', {
      timeout,
      enableHighAccuracy,
      useCache,
      operation: 'getBrowserLocation'
    });

    // Get current position
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge: useCache ? CACHE_DURATION : 0
      };

      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          let geoError: GeolocationError;
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              geoError = {
                code: 'PERMISSION_DENIED',
                message: 'User denied the request for geolocation'
              };
              break;
            case error.POSITION_UNAVAILABLE:
              geoError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'Location information is unavailable'
              };
              break;
            case error.TIMEOUT:
              geoError = {
                code: 'TIMEOUT',
                message: 'The request to get user location timed out'
              };
              break;
            default:
              geoError = {
                code: 'POSITION_UNAVAILABLE',
                message: error.message || 'An unknown error occurred'
              };
              break;
          }
          
          logger.error('Browser geolocation failed', {
            code: geoError.code,
            message: geoError.message,
            nativeError: error,
            operation: 'getBrowserLocation'
          });
          
          reject(geoError);
        },
        options
      );
    });

    // Extract coordinates
    const coordinates: BrowserCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };

    // Validate coordinates
    if (
      typeof coordinates.latitude !== 'number' ||
      typeof coordinates.longitude !== 'number' ||
      isNaN(coordinates.latitude) ||
      isNaN(coordinates.longitude) ||
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      const error: GeolocationError = {
        code: 'INVALID_COORDINATES',
        message: 'Invalid coordinates received from browser'
      };
      
      logger.error('Invalid coordinates from browser', {
        coordinates,
        operation: 'getBrowserLocation'
      });
      
      throw error;
    }

    logger.info('Browser geolocation successful', {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: coordinates.accuracy,
      operation: 'getBrowserLocation'
    });

    // Cache the result if caching is enabled
    if (useCache) {
      setCachedLocation(coordinates);
    }

    return coordinates;
  } catch (error) {
    // If it's already a GeolocationError, re-throw it
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }

    // Otherwise, wrap it in a GeolocationError
    const geoError: GeolocationError = {
      code: 'POSITION_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Unknown geolocation error'
    };

    logger.error('Unexpected geolocation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'getBrowserLocation'
    });

    throw geoError;
  }
}

/**
 * Clear cached location
 */
export function clearLocationCache(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CACHE_KEY);
      
      logger.debug('Location cache cleared', {
        operation: 'clearLocationCache'
      });
    }
  } catch (error) {
    logger.error('Failed to clear location cache', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'clearLocationCache'
    });
  }
}

/**
 * Watch position changes (for real-time tracking)
 */
export function watchBrowserLocation(
  callback: (coordinates: BrowserCoordinates) => void,
  errorCallback?: (error: GeolocationError) => void,
  options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }
): number | null {
  try {
    if (!isGeolocationSupported()) {
      const error: GeolocationError = {
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not supported by this browser'
      };
      
      if (errorCallback) {
        errorCallback(error);
      }
      
      return null;
    }

    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 60000 // 1 minute
    } = options || {};

    logger.info('Starting location watch', {
      enableHighAccuracy,
      timeout,
      maximumAge,
      operation: 'watchBrowserLocation'
    });

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coordinates: BrowserCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        logger.debug('Location watch update', {
          coordinates,
          operation: 'watchBrowserLocation'
        });

        callback(coordinates);
      },
      (error) => {
        let geoError: GeolocationError;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            geoError = {
              code: 'PERMISSION_DENIED',
              message: 'User denied the request for geolocation'
            };
            break;
          case error.POSITION_UNAVAILABLE:
            geoError = {
              code: 'POSITION_UNAVAILABLE',
              message: 'Location information is unavailable'
            };
            break;
          case error.TIMEOUT:
            geoError = {
              code: 'TIMEOUT',
              message: 'The request to get user location timed out'
            };
            break;
          default:
            geoError = {
              code: 'POSITION_UNAVAILABLE',
              message: error.message || 'An unknown error occurred'
            };
            break;
        }

        logger.error('Location watch error', {
          code: geoError.code,
          message: geoError.message,
          operation: 'watchBrowserLocation'
        });

        if (errorCallback) {
          errorCallback(geoError);
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );

    return watchId;
  } catch (error) {
    const geoError: GeolocationError = {
      code: 'POSITION_UNAVAILABLE',
      message: error instanceof Error ? error.message : 'Failed to start location watch'
    };

    logger.error('Failed to start location watch', {
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'watchBrowserLocation'
    });

    if (errorCallback) {
      errorCallback(geoError);
    }

    return null;
  }
}

/**
 * Stop watching position changes
 */
export function stopWatchingLocation(watchId: number): void {
  try {
    if (isGeolocationSupported()) {
      navigator.geolocation.clearWatch(watchId);
      
      logger.debug('Stopped location watch', {
        watchId,
        operation: 'stopWatchingLocation'
      });
    }
  } catch (error) {
    logger.error('Failed to stop location watch', {
      watchId,
      error: error instanceof Error ? error.message : 'Unknown error',
      operation: 'stopWatchingLocation'
    });
  }
}
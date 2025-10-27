export interface GeoLocation {
  latitude: number;
  longitude: number;
  h3Index: string;
  h3Resolution: number;
  countryCode?: string;
  city?: string;
  accuracy: number;
  source: 'ip' | 'browser_geo' | 'manual';
}

export interface H3Cell {
  index: string;
  resolution: number;
  boundary: [number, number][];
  center: [number, number];
}

export interface IPGeolocationResult {
  countryCode?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  accuracy: number;
}

export interface BrowserCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface LocationConsent {
  granted: boolean;
  timestamp: number;
  precisionLevel: 'country' | 'city' | 'precise';
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'INVALID_COORDINATES' | 'NETWORK_ERROR';
  message: string;
}
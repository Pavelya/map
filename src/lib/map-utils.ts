/**
 * Map Utilities
 *
 * Helper functions for map interactions, coordinate conversions, and viewport management.
 */

import type { Map, LngLatBoundsLike, FitBoundsOptions, FlyToOptions } from 'maplibre-gl';
import { cellToBoundary } from 'h3-js';

/**
 * Fit map to bounding box with smooth animation
 */
export function fitMapToBounds(
  map: Map,
  bounds: LngLatBoundsLike,
  options?: FitBoundsOptions
): void {
  if (!map) return;

  const defaultOptions: FitBoundsOptions = {
    padding: 50,
    duration: 1000,
    maxZoom: 10,
  };

  map.fitBounds(bounds, { ...defaultOptions, ...options });
}

/**
 * Fly to a specific location with smooth transition
 */
export function flyToLocation(
  map: Map,
  lng: number,
  lat: number,
  zoom?: number,
  options?: Omit<FlyToOptions, 'center' | 'zoom'>
): void {
  if (!map) return;

  const defaultOptions: FlyToOptions = {
    center: [lng, lat],
    zoom: zoom ?? 8,
    duration: 2000,
    essential: true,
  };

  map.flyTo({ ...defaultOptions, ...options });
}

/**
 * Get current map viewport bounds
 */
export function getMapBounds(map: Map): {
  north: number;
  south: number;
  east: number;
  west: number;
} | null {
  if (!map) return null;

  const bounds = map.getBounds();
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

/**
 * Check if a coordinate is visible in current map viewport
 */
export function isLocationInView(map: Map, lng: number, lat: number): boolean {
  if (!map) return false;

  const bounds = map.getBounds();
  return bounds.contains([lng, lat]);
}

/**
 * Convert H3 cell to Mapbox coordinates [lng, lat]
 */
export function convertToMapboxCoordinates(h3Index: string): [number, number] | null {
  try {
    const boundary = cellToBoundary(h3Index);
    if (!boundary || boundary.length === 0) return null;

    // Calculate centroid of the H3 cell
    const lng = boundary.reduce((sum, coord) => sum + coord[1], 0) / boundary.length;
    const lat = boundary.reduce((sum, coord) => sum + coord[0], 0) / boundary.length;

    return [lng, lat];
  } catch (error) {
    console.error('Error converting H3 to coordinates:', error);
    return null;
  }
}

/**
 * Convert H3 cell to polygon boundary for Mapbox
 * Returns coordinates in [lng, lat] format that Mapbox expects
 */
export function h3ToPolygon(h3Index: string): number[][] | null {
  try {
    const boundary = cellToBoundary(h3Index);
    if (!boundary || boundary.length === 0) return null;

    // Convert from [lat, lng] to [lng, lat] and close the polygon
    const coords = boundary.map(([lat, lng]) => [lng, lat]);
    // Close the polygon
    if (coords.length > 0 && coords[0]) {
      coords.push(coords[0]);
    }

    return coords;
  } catch (error) {
    console.error('Error converting H3 to polygon:', error);
    return null;
  }
}

/**
 * Calculate the center point of a bounding box
 */
export function getBoundsCenter(bounds: [[number, number], [number, number]]): [number, number] {
  const [[west, south], [east, north]] = bounds;
  return [(west + east) / 2, (south + north) / 2];
}

/**
 * Clamp zoom level within map constraints
 */
export function clampZoom(zoom: number, minZoom = 1, maxZoom = 12): number {
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lng: number, lat: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/**
 * Check if map is fully loaded and ready
 */
export function isMapReady(map: Map | null): boolean {
  return map !== null && map.loaded();
}

/**
 * Wait for map to be fully loaded
 */
export function waitForMapLoad(map: Map): Promise<void> {
  return new Promise((resolve) => {
    if (map.loaded()) {
      resolve();
    } else {
      map.once('load', () => resolve());
    }
  });
}

/**
 * Safely remove a map layer if it exists
 */
export function removeLayerSafely(map: Map, layerId: string): void {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

/**
 * Safely remove a map source if it exists
 */
export function removeSourceSafely(map: Map, sourceId: string): void {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

/**
 * Get the current zoom level rounded to integer
 */
export function getCurrentZoom(map: Map): number {
  return Math.round(map.getZoom());
}

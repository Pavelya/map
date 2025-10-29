/**
 * MapLibre GL JS Configuration
 *
 * Central configuration for map initialization, styling, and performance settings.
 * Using MapLibre GL JS - a free, open-source alternative to Mapbox GL JS.
 */

import type { MapOptions, StyleSpecification } from 'maplibre-gl';

/**
 * Free tile sources for MapLibre
 *
 * Options:
 * 1. OpenStreetMap (completely free, no API key needed)
 * 2. Maptiler (free tier: 100k tile loads/month with API key)
 */

// Dark theme style using free OSM tiles with multiple fallbacks
const OSM_DARK_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        // Primary: Direct from OpenStreetMap (reliable, unlimited, free)
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        // Fallback 1: OSM mirror A
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        // Fallback 2: OSM mirror B
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
};

// Light theme (alternative) with multiple fallbacks
const OSM_LIGHT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        // Primary: Direct from OpenStreetMap (reliable, unlimited, free)
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        // Fallback 1: OSM mirror A
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        // Fallback 2: OSM mirror B
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
};

export const mapConfig = {
  // Map style - using free OpenStreetMap dark tiles
  // Can be replaced with Maptiler free tier for better styling
  style: OSM_DARK_STYLE,

  // Initial view - centered on world view
  center: [0, 20] as [number, number],

  // Zoom levels
  zoom: 2,
  minZoom: 1,
  maxZoom: 12,

  // Disable 3D rotation and pitch for simpler UX
  pitchWithRotate: false,
  dragRotate: false,
  touchPitch: false,

  // Performance optimizations
  maxParallelImageRequests: 16,
  refreshExpiredTiles: false,
  fadeDuration: 300,

  // Interaction settings
  trackResize: true,
  doubleClickZoom: true,
  scrollZoom: true,
  boxZoom: true,
  dragPan: true,
  keyboard: true,
  touchZoomRotate: true,
} as const;

/**
 * Get Maptiler API key from environment (optional)
 * If you want better styled maps, sign up for free at https://www.maptiler.com/
 * Free tier: 100k tile loads/month
 */
export function getMaptilerKey(): string | undefined {
  return process.env['NEXT_PUBLIC_MAPTILER_KEY'];
}

/**
 * Get Maptiler style URL (if API key is available)
 */
export function getMaptilerStyle(styleId: string = 'dataviz-dark'): string | null {
  const key = getMaptilerKey();
  if (!key || key.startsWith('your-')) {
    return null;
  }
  return `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`;
}

/**
 * Create full MapLibre map options with fallback handling
 */
export function createMapOptions(container: HTMLDivElement): MapOptions {
  // Try to use Maptiler if key is available, otherwise fall back to OSM
  const maptilerStyle = getMaptilerStyle();
  const style = maptilerStyle || mapConfig.style;

  console.log('[Map] Using tile source:', maptilerStyle ? 'Maptiler' : 'OpenStreetMap (free, unlimited)');

  return {
    container,
    style,
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    pitchWithRotate: mapConfig.pitchWithRotate,
    dragRotate: mapConfig.dragRotate,
    touchPitch: mapConfig.touchPitch,
    fadeDuration: mapConfig.fadeDuration,
    trackResize: mapConfig.trackResize,
    // Add tile loading configuration
    maxTileCacheSize: 50, // Limit cache to avoid memory issues
    transformRequest: (url: string, resourceType?: string) => {
      // Log tile requests for debugging (sample 1% to avoid spam)
      if (resourceType === 'Tile' && Math.random() < 0.01) {
        console.log('[Map] Loading tile:', url);
      }
      return { url };
    },
  };
}

/**
 * Export alternative styles for easy switching
 */
export const MAP_STYLES = {
  DARK: OSM_DARK_STYLE,
  LIGHT: OSM_LIGHT_STYLE,
} as const;

/**
 * Map event names for type safety
 */
export const MAP_EVENTS = {
  LOAD: 'load',
  MOVE: 'move',
  MOVEEND: 'moveend',
  ZOOM: 'zoom',
  ZOOMEND: 'zoomend',
  CLICK: 'click',
  MOUSEENTER: 'mouseenter',
  MOUSELEAVE: 'mouseleave',
  MOUSEMOVE: 'mousemove',
  ERROR: 'error',
  RESIZE: 'resize',
} as const;

export type MapEventName = typeof MAP_EVENTS[keyof typeof MAP_EVENTS];

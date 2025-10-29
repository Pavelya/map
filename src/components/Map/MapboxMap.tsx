'use client';

/**
 * MapLibre Map Component
 *
 * Core component that initializes and manages the MapLibre GL JS map instance.
 * Handles map lifecycle, controls, and responsive behavior.
 *
 * Using MapLibre GL JS - a free, open-source alternative to Mapbox GL JS.
 */

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapContext } from '@/contexts/MapContext';
import { createMapOptions } from '@/lib/map-config';
import { MapLoadingSkeleton, MapError } from './MapContainer';

export function MapboxMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { setMap, setIsLoaded, setError, error } = useMapContext();
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    // Ensure container exists
    if (!mapContainerRef.current) return;

    let map: maplibregl.Map | null = null;
    let resizeHandler: (() => void) | null = null;

    const initializeMap = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Create map instance
        const mapOptions = createMapOptions(mapContainerRef.current!);
        map = new maplibregl.Map(mapOptions);

        // Add navigation controls (zoom, rotation)
        const navControl = new maplibregl.NavigationControl({
          showCompass: false, // Disable compass since rotation is disabled
          showZoom: true,
        });
        map.addControl(navControl, 'top-right');

        // Add scale control
        const scaleControl = new maplibregl.ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        });
        map.addControl(scaleControl, 'bottom-left');

        // Handle map load event
        map.on('load', () => {
          console.log('[Map] MapLibre map loaded successfully');
          setIsLoaded(true);
          setIsLoading(false);
        });

        // Tile error tracking
        let tileErrorCount = 0;
        const maxTileErrors = 10;

        // Handle map errors with categorization
        map.on('error', (e) => {
          const errorMsg = e.error?.message || 'Failed to load map';

          // Categorize error types
          if (errorMsg.includes('tiles') || errorMsg.includes('source')) {
            console.error('[Map] Tile loading error:', errorMsg);
            setError(new Error('Map tiles failed to load. Using fallback tile provider...'));
            // Don't block - map may still work with cached tiles
            setIsLoading(false);
          } else if (errorMsg.includes('style') || errorMsg.includes('glyphs')) {
            console.error('[Map] Style loading error:', errorMsg);
            setError(new Error('Map style failed to load. Check your internet connection.'));
            setIsLoading(false);
          } else {
            console.error('[Map] Unknown map error:', e);
            setError(new Error(`Map error: ${errorMsg}`));
            setIsLoading(false);
          }
        });

        // Monitor tile loading for excessive errors
        map.on('sourcedataloading', (e) => {
          if (e.sourceId === 'osm-tiles' && e.tile) {
            // Log occasionally for debugging
            if (Math.random() < 0.05) {
              console.log('[Map] Loading tile from source:', e.sourceId);
            }
          }
        });

        // Track tile-specific errors
        map.on('error', (e: any) => {
          if (e.sourceId === 'osm-tiles') {
            tileErrorCount++;
            console.warn(`[Map] Tile error (${tileErrorCount}/${maxTileErrors}):`, e);

            if (tileErrorCount >= maxTileErrors) {
              setError(new Error('Too many tile loading errors. Please check your connection.'));
              setIsLoading(false);
            }
          }
        });

        // Handle resize events
        resizeHandler = () => {
          map?.resize();
        };
        window.addEventListener('resize', resizeHandler);

        // Set map instance in context
        setMap(map);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize map');
        console.error('Map initialization error:', error);
        setError(error);
        setIsLoading(false);
      }
    };

    initializeMap();

    // Cleanup on unmount
    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (map) {
        map.remove();
      }
    };
  }, [setMap, setIsLoaded, setError, retryCount]);

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount((prev) => prev + 1);
      setError(null);
      setIsLoading(true);
    } else {
      setError(new Error('Maximum retry attempts reached. Please refresh the page.'));
    }
  };

  return (
    <>
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading state */}
      {isLoading && !error && <MapLoadingSkeleton />}

      {/* Error state */}
      {error && (
        <MapError
          error={error}
          onRetry={handleRetry}
          retryCount={retryCount}
          maxRetries={maxRetries}
        />
      )}
    </>
  );
}

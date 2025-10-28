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
          console.log('MapLibre map loaded successfully');
          setIsLoaded(true);
          setIsLoading(false);
        });

        // Handle map errors
        map.on('error', (e) => {
          console.error('Map error:', e.error);
          setError(new Error(e.error?.message || 'Failed to load map'));
          setIsLoading(false);
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
    setRetryCount((prev) => prev + 1);
  };

  return (
    <>
      {/* Map container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Loading state */}
      {isLoading && !error && <MapLoadingSkeleton />}

      {/* Error state */}
      {error && <MapError error={error} onRetry={handleRetry} />}
    </>
  );
}

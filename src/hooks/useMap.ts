'use client';

/**
 * Map Hooks
 *
 * Custom React hooks for interacting with the MapLibre map instance.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { MapLayerEventType } from 'maplibre-gl';
import { useMapContext } from '@/contexts/MapContext';
import type { MapEventName } from '@/lib/map-config';

/**
 * Hook to access the map instance from context
 *
 * @returns The map instance, loading state, and error
 */
export function useMap() {
  const { map, isLoaded, error } = useMapContext();

  return {
    map,
    isLoaded,
    error,
  };
}

/**
 * Hook to subscribe to map events with automatic cleanup
 *
 * @param eventName - The map event to listen to
 * @param callback - Function to call when event fires
 * @param layerId - Optional layer ID for layer-specific events
 */
export function useMapEvent<K extends keyof MapLayerEventType>(
  eventName: K | MapEventName,
  callback: (event: MapLayerEventType[K] & Object) => void,
  layerId?: string
) {
  const { map, isLoaded } = useMapContext();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handler = (event: any) => {
      callbackRef.current(event);
    };

    // Add event listener (layer-specific or general)
    if (layerId) {
      map.on(eventName as any, layerId, handler);
    } else {
      map.on(eventName as any, handler);
    }

    // Cleanup on unmount
    return () => {
      if (layerId) {
        map.off(eventName as any, layerId, handler);
      } else {
        map.off(eventName as any, handler);
      }
    };
  }, [map, isLoaded, eventName, layerId]);
}

/**
 * Hook to get a reference to a specific map layer
 *
 * @param layerId - The ID of the layer to get
 * @returns True if layer exists, false otherwise
 */
export function useMapLayer(layerId: string) {
  const { map, isLoaded } = useMapContext();
  const [hasLayer, setHasLayer] = React.useState(false);

  useEffect(() => {
    if (!map || !isLoaded) {
      setHasLayer(false);
      return;
    }

    const updateLayer = () => {
      const foundLayer = map.getLayer(layerId);
      setHasLayer(!!foundLayer);
    };

    updateLayer();

    // Listen for style changes that might affect layers
    map.on('styledata', updateLayer);

    return () => {
      map.off('styledata', updateLayer);
    };
  }, [map, isLoaded, layerId]);

  return hasLayer;
}

/**
 * Hook to watch map zoom level changes
 *
 * @param callback - Function to call when zoom changes
 */
export function useMapZoom(callback: (zoom: number) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useMapEvent('zoomend', (event) => {
    const zoom = event.target.getZoom();
    callbackRef.current(zoom);
  });
}

/**
 * Hook to watch map movement/pan changes
 *
 * @param callback - Function to call when map moves
 */
export function useMapMove(callback: (center: [number, number]) => void) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useMapEvent('moveend', (event) => {
    const center = event.target.getCenter();
    callbackRef.current([center.lng, center.lat]);
  });
}

/**
 * Hook to get map cursor style controller
 *
 * @returns Functions to set cursor to pointer or default
 */
export function useMapCursor() {
  const { map } = useMapContext();

  const setPointer = useCallback(() => {
    if (map) {
      map.getCanvas().style.cursor = 'pointer';
    }
  }, [map]);

  const setDefault = useCallback(() => {
    if (map) {
      map.getCanvas().style.cursor = '';
    }
  }, [map]);

  return { setPointer, setDefault };
}

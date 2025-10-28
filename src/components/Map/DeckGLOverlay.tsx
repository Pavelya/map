'use client';

/**
 * DeckGL Overlay Component
 *
 * Integrates Deck.gl with MapLibre GL JS for rendering H3 hexagon layers.
 * Manages the overlay lifecycle, layer updates, and interaction events.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, PickingInfo } from '@deck.gl/core';
import type { H3VoteData } from '@/lib/layers/data-transformer';

/**
 * DeckGL overlay props
 */
export interface DeckGLOverlayProps {
  /** MapLibre map instance */
  map: MapLibreMap | null;

  /** Array of Deck.gl layers to render */
  layers: Layer[];

  /** Callback when layers are updated */
  onLayersUpdate?: (layers: Layer[]) => void;

  /** Callback when user hovers over a feature */
  onHover?: (info: PickingInfo<H3VoteData>) => void;

  /** Callback when user clicks a feature */
  onClick?: (info: PickingInfo<H3VoteData>) => void;

  /** Whether to show cursor pointer on hover */
  getCursor?: (state: { isDragging: boolean; isHovering: boolean }) => string;

  /** Interleaved rendering mode (default: false) */
  interleaved?: boolean;
}

/**
 * DeckGL Overlay Component
 *
 * Renders Deck.gl layers on top of MapLibre map.
 * Handles lifecycle management and cleanup.
 *
 * @example
 * const layers = [createH3Layer(data, options)];
 *
 * <DeckGLOverlay
 *   map={map}
 *   layers={layers}
 *   onHover={handleHover}
 *   onClick={handleClick}
 * />
 */
export function DeckGLOverlay({
  map,
  layers,
  onLayersUpdate,
  onHover,
  onClick,
  getCursor,
  interleaved = false,
}: DeckGLOverlayProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [isReady, setIsReady] = useState(false);

  /**
   * Initialize Deck.gl overlay when map is ready
   */
  useEffect(() => {
    if (!map) {
      return;
    }

    // Wait for map to be fully loaded
    if (!map.loaded()) {
      const handleLoad = () => {
        initializeOverlay();
      };
      map.once('load', handleLoad);

      return () => {
        map.off('load', handleLoad);
      };
    } else {
      initializeOverlay();
    }

    function initializeOverlay() {
      try {
        // Create Deck.gl overlay
        const overlay = new MapboxOverlay({
          interleaved,
          layers: [],
        });

        // Add overlay to map
        // @ts-ignore - MapboxOverlay works with MapLibre despite the name
        map.addControl(overlay);

        overlayRef.current = overlay;
        setIsReady(true);

        console.log('DeckGL overlay initialized');
      } catch (error) {
        console.error('Failed to initialize DeckGL overlay:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      if (overlayRef.current && map) {
        try {
          // @ts-ignore
          map.removeControl(overlayRef.current);
          overlayRef.current = null;
          setIsReady(false);
        } catch (error) {
          console.error('Error removing DeckGL overlay:', error);
        }
      }
    };
  }, [map, interleaved]);

  /**
   * Update layers when they change
   */
  useEffect(() => {
    if (!overlayRef.current || !isReady) {
      return;
    }

    try {
      // Update overlay with new layers and event handlers
      overlayRef.current.setProps({
        layers,
        onHover: onHover as any,
        onClick: onClick as any,
        getCursor: getCursor as any,
      });

      // Trigger callback
      if (onLayersUpdate) {
        onLayersUpdate(layers);
      }
    } catch (error) {
      console.error('Error updating DeckGL layers:', error);
    }
  }, [layers, isReady, onHover, onClick, getCursor, onLayersUpdate]);

  /**
   * Handle window resize
   */
  useEffect(() => {
    if (!overlayRef.current || !map) {
      return;
    }

    const handleResize = () => {
      // Trigger deck.gl redraw on resize
      overlayRef.current?.setProps({});
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // This component doesn't render anything visible
  // It just manages the Deck.gl overlay on the map
  return null;
}

/**
 * Hook for managing DeckGL overlay
 *
 * Provides a simple API for adding/updating layers.
 *
 * @example
 * const { updateLayers, isReady } = useDeckGLOverlay(map, {
 *   onHover: handleHover,
 *   onClick: handleClick
 * });
 *
 * // Update layers
 * useEffect(() => {
 *   if (isReady) {
 *     const layer = createH3Layer(data, options);
 *     updateLayers([layer]);
 *   }
 * }, [data, isReady]);
 */
export function useDeckGLOverlay(
  map: MapLibreMap | null,
  options: {
    onHover?: (info: PickingInfo<H3VoteData>) => void;
    onClick?: (info: PickingInfo<H3VoteData>) => void;
    getCursor?: (state: { isDragging: boolean; isHovering: boolean }) => string;
    interleaved?: boolean;
  } = {}
) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [isReady, setIsReady] = useState(false);

  const updateLayers = useCallback((newLayers: Layer[]) => {
    setLayers(newLayers);
  }, []);

  const addLayer = useCallback((layer: Layer) => {
    setLayers((prev) => [...prev, layer]);
  }, []);

  const removeLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
  }, []);

  const clearLayers = useCallback(() => {
    setLayers([]);
  }, []);

  return {
    layers,
    updateLayers,
    addLayer,
    removeLayer,
    clearLayers,
    isReady,
    overlayComponent: (
      <DeckGLOverlay
        map={map}
        layers={layers}
        onLayersUpdate={() => setIsReady(true)}
        {...options}
      />
    ),
  };
}

/**
 * Default cursor function
 *
 * Shows pointer cursor when hovering over pickable objects.
 */
export function defaultGetCursor({
  isDragging,
  isHovering,
}: {
  isDragging: boolean;
  isHovering: boolean;
}): string {
  if (isDragging) return 'grabbing';
  if (isHovering) return 'pointer';
  return 'grab';
}

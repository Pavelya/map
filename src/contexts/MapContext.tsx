'use client';

/**
 * Map Context
 *
 * Provides React context for sharing MapLibre map instance across components.
 * Child components can access the map instance, loading state, and errors via useMap hook.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Map } from 'maplibre-gl';

interface MapContextValue {
  /** The MapLibre map instance */
  map: Map | null;

  /** Whether the map has finished loading */
  isLoaded: boolean;

  /** Error that occurred during map initialization */
  error: Error | null;

  /** Set the map instance (used by MapboxMap component) */
  setMap: (map: Map | null) => void;

  /** Set the loaded state */
  setIsLoaded: (loaded: boolean) => void;

  /** Set error state */
  setError: (error: Error | null) => void;
}

const MapContext = createContext<MapContextValue | undefined>(undefined);

interface MapProviderProps {
  children: React.ReactNode;
}

/**
 * Map Provider Component
 *
 * Wraps the map component and provides context to child components.
 */
export function MapProvider({ children }: MapProviderProps) {
  const [map, setMapState] = useState<Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setMap = useCallback((newMap: Map | null) => {
    setMapState(newMap);
    if (newMap) {
      setError(null);
    }
  }, []);

  // Clean up map instance on unmount
  useEffect(() => {
    return () => {
      if (map) {
        map.remove();
        setMapState(null);
        setIsLoaded(false);
      }
    };
  }, [map]);

  const value: MapContextValue = {
    map,
    isLoaded,
    error,
    setMap,
    setIsLoaded,
    setError,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

/**
 * Hook to access map context
 *
 * @throws Error if used outside of MapProvider
 */
export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);

  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }

  return context;
}

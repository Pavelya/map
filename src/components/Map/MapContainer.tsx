'use client';

/**
 * Map Container Component
 *
 * Wrapper component that handles map loading states, errors, and provides
 * a properly sized container for the Mapbox map.
 */

import React from 'react';
import { MapProvider } from '@/contexts/MapContext';
import { MapboxMap } from './MapboxMap';

interface MapContainerProps {
  /** Additional CSS classes for the container */
  className?: string;

  /** Child components to render on top of the map */
  children?: React.ReactNode;
}

/**
 * Map Container with Loading and Error States
 */
export function MapContainer({ className = '', children }: MapContainerProps) {
  return (
    <MapProvider>
      <div className={`relative w-full h-full ${className}`}>
        {/* Map Component */}
        <MapboxMap />

        {/* Child components (overlays, controls, etc.) */}
        {children}
      </div>
    </MapProvider>
  );
}

/**
 * Loading Skeleton Component
 */
export function MapLoadingSkeleton() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        </div>
        <p className="text-gray-300 text-sm">Loading map...</p>
      </div>
    </div>
  );
}

/**
 * Error Display Component
 */
interface MapErrorProps {
  error: Error;
  onRetry?: () => void;
  retryCount?: number;
  maxRetries?: number;
}

export function MapError({ error, onRetry, retryCount = 0, maxRetries = 3 }: MapErrorProps) {
  const canRetry = retryCount < maxRetries;

  // Determine error type for better messaging
  const isTileError = error.message.includes('tile');
  const isNetworkError = error.message.includes('connection') || error.message.includes('network');

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900">
      <div className="text-center max-w-md px-4">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Map</h3>
        <p className="text-gray-400 text-sm mb-4">{error.message}</p>

        {isTileError && (
          <p className="text-xs text-gray-500 mb-4">
            The map tile server may be experiencing issues. This is usually temporary.
          </p>
        )}

        {isNetworkError && (
          <p className="text-xs text-gray-500 mb-4">
            Please check your internet connection and try again.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {onRetry && canRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Retry {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </button>
          )}

          {!canRetry && (
            <p className="text-xs text-red-400 mb-2">
              Maximum retry attempts reached. Please refresh the page.
            </p>
          )}

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>

        <details className="mt-4 text-left">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
            Technical Details
          </summary>
          <pre className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-auto text-left">
            {error.stack || error.message}
          </pre>
        </details>
      </div>
    </div>
  );
}

/**
 * Map Overlay Container
 *
 * Container for UI elements that should appear on top of the map
 */
interface MapOverlayProps {
  /** Position of the overlay */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

  /** Child components */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

export function MapOverlay({
  position = 'top-left',
  children,
  className = '',
}: MapOverlayProps) {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    center: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  };

  return (
    <div className={`absolute z-20 ${positionClasses[position]} ${className}`}>
      {children}
    </div>
  );
}

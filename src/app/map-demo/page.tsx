'use client';

/**
 * Map Demo Page
 *
 * Demonstrates the Mapbox integration with interactive components
 */

export const dynamic = 'force-dynamic';

import { MapContainer, MapOverlay } from '@/components/Map';
import { useMap, useMapEvent, useMapZoom, useMapMove } from '@/hooks/useMap';
import { useState } from 'react';
import { formatCoordinates } from '@/lib/map-utils';

function MapStats() {
  const { isLoaded } = useMap();
  const [zoom, setZoom] = useState(2);
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [lastClick, setLastClick] = useState<[number, number] | null>(null);

  useMapZoom((newZoom) => {
    setZoom(newZoom);
  });

  useMapMove((newCenter) => {
    setCenter(newCenter);
  });

  useMapEvent('click', (e) => {
    setLastClick([e.lngLat.lng, e.lngLat.lat]);
  });

  if (!isLoaded) return null;

  return (
    <MapOverlay position="top-left" className="bg-black/90 text-white p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-2">Map Stats</h3>
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-semibold">Zoom:</span> {zoom.toFixed(2)}
        </p>
        <p>
          <span className="font-semibold">Center:</span> {formatCoordinates(center[0], center[1])}
        </p>
        {lastClick && (
          <p>
            <span className="font-semibold">Last Click:</span>{' '}
            {formatCoordinates(lastClick[0], lastClick[1])}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">Click the map to see coordinates</p>
      </div>
    </MapOverlay>
  );
}

function MapControls() {
  const { map, isLoaded } = useMap();

  if (!isLoaded || !map) return null;

  const locations = [
    { name: 'World View', center: [0, 20] as [number, number], zoom: 2 },
    { name: 'New York', center: [-74.006, 40.7128] as [number, number], zoom: 10 },
    { name: 'London', center: [-0.1276, 51.5074] as [number, number], zoom: 10 },
    { name: 'Tokyo', center: [139.6917, 35.6895] as [number, number], zoom: 10 },
    { name: 'Sydney', center: [151.2093, -33.8688] as [number, number], zoom: 10 },
  ];

  const flyTo = (location: typeof locations[0]) => {
    map.flyTo({
      center: location.center,
      zoom: location.zoom,
      duration: 2000,
    });
  };

  return (
    <MapOverlay position="top-right" className="bg-black/90 text-white p-4 rounded-lg shadow-lg">
      <h3 className="text-lg font-bold mb-2">Quick Navigation</h3>
      <div className="space-y-2">
        {locations.map((location) => (
          <button
            key={location.name}
            onClick={() => flyTo(location)}
            className="block w-full text-left px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          >
            {location.name}
          </button>
        ))}
      </div>
    </MapOverlay>
  );
}

function MapInfo() {
  return (
    <MapOverlay position="bottom-right" className="bg-black/90 text-white p-4 rounded-lg shadow-lg max-w-xs">
      <h3 className="text-lg font-bold mb-2">Mapbox Integration</h3>
      <ul className="text-xs space-y-1 text-gray-300">
        <li>Mapbox GL JS v2.15+</li>
        <li>Dark theme style</li>
        <li>Navigation controls enabled</li>
        <li>Scale control visible</li>
        <li>Responsive design</li>
        <li>Performance optimized</li>
      </ul>
    </MapOverlay>
  );
}

export default function MapDemoPage() {
  return (
    <div className="h-screen w-screen">
      <MapContainer>
        <MapStats />
        <MapControls />
        <MapInfo />
      </MapContainer>
    </div>
  );
}

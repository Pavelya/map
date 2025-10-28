# Mapbox Map Components

Complete Mapbox GL JS integration for the Team Vote Map application with React components, hooks, and utilities.

## Components

### MapContainer

The main container component that provides map context and handles loading/error states.

```tsx
import { MapContainer } from '@/components/Map';

function MyPage() {
  return (
    <div className="h-screen">
      <MapContainer />
    </div>
  );
}
```

### MapOverlay

Position UI elements on top of the map.

```tsx
import { MapContainer, MapOverlay } from '@/components/Map';

function MyPage() {
  return (
    <MapContainer>
      <MapOverlay position="top-right">
        <button>Custom Control</button>
      </MapOverlay>
    </MapContainer>
  );
}
```

## Hooks

### useMap

Access the map instance and loading state.

```tsx
import { useMap } from '@/hooks/useMap';

function MyComponent() {
  const { map, isLoaded, error } = useMap();

  if (error) return <div>Error: {error.message}</div>;
  if (!isLoaded) return <div>Loading...</div>;

  // Use map instance
  const zoom = map?.getZoom();

  return <div>Current zoom: {zoom}</div>;
}
```

### useMapEvent

Subscribe to map events with automatic cleanup.

```tsx
import { useMapEvent } from '@/hooks/useMap';

function MyComponent() {
  useMapEvent('click', (e) => {
    console.log('Map clicked at:', e.lngLat);
  });

  return <div>Click the map!</div>;
}
```

### useMapZoom

Watch zoom level changes.

```tsx
import { useState } from 'react';
import { useMapZoom } from '@/hooks/useMap';

function ZoomDisplay() {
  const [zoom, setZoom] = useState(2);

  useMapZoom((newZoom) => {
    setZoom(Math.round(newZoom));
  });

  return <div>Zoom: {zoom}</div>;
}
```

### useMapMove

Watch map center changes.

```tsx
import { useMapMove } from '@/hooks/useMap';

function LocationDisplay() {
  const [center, setCenter] = useState([0, 0]);

  useMapMove((newCenter) => {
    setCenter(newCenter);
  });

  return <div>Center: {center[0].toFixed(2)}, {center[1].toFixed(2)}</div>;
}
```

### useMapCursor

Control the map cursor style.

```tsx
import { useMapCursor } from '@/hooks/useMap';

function MyComponent() {
  const { setPointer, setDefault } = useMapCursor();

  return (
    <div
      onMouseEnter={setPointer}
      onMouseLeave={setDefault}
    >
      Hover to change cursor
    </div>
  );
}
```

## Utilities

### Map Navigation

```tsx
import { flyToLocation, fitMapToBounds } from '@/lib/map-utils';

// Fly to a specific location
flyToLocation(map, -74.006, 40.7128, 10); // NYC

// Fit to bounding box
const bounds: LngLatBoundsLike = [
  [-74.2591, 40.4774], // Southwest
  [-73.7004, 40.9176], // Northeast
];
fitMapToBounds(map, bounds);
```

### Coordinate Conversion

```tsx
import { convertToMapboxCoordinates, h3ToPolygon } from '@/lib/map-utils';

// Convert H3 cell to center coordinates
const coords = convertToMapboxCoordinates('8a2a1072b59ffff');
// Returns: [lng, lat]

// Convert H3 cell to polygon boundary
const polygon = h3ToPolygon('8a2a1072b59ffff');
// Returns: [[lng, lat], [lng, lat], ...]
```

### Viewport Helpers

```tsx
import {
  getMapBounds,
  isLocationInView,
  formatCoordinates
} from '@/lib/map-utils';

// Get current viewport bounds
const bounds = getMapBounds(map);
// Returns: { north, south, east, west }

// Check if location is visible
const isVisible = isLocationInView(map, -74.006, 40.7128);

// Format coordinates for display
const formatted = formatCoordinates(-74.006, 40.7128);
// Returns: "40.7128°N, 74.0060°W"
```

## Configuration

Default map configuration is in [src/lib/map-config.ts](../../lib/map-config.ts):

- **Style**: `mapbox://styles/mapbox/dark-v11`
- **Center**: `[0, 20]` (world view)
- **Zoom**: `2` (initial), `1-12` (min-max)
- **Controls**: Navigation (zoom) and scale
- **Performance**: Optimized for fast loading

### Custom Configuration

Create your own map options:

```tsx
import { createMapOptions } from '@/lib/map-config';

const container = document.getElementById('map')!;
const options = createMapOptions(container as HTMLDivElement);

// Override specific options
const customOptions = {
  ...options,
  center: [-74.006, 40.7128],
  zoom: 10,
};
```

## Environment Setup

Ensure `NEXT_PUBLIC_MAPBOX_TOKEN` is set in your `.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-actual-token-here
```

Get your token from [Mapbox Account](https://account.mapbox.com/access-tokens/).

## Full Example

```tsx
'use client';

import { MapContainer, MapOverlay } from '@/components/Map';
import { useMap, useMapEvent, useMapZoom } from '@/hooks/useMap';
import { useState } from 'react';

function MapStats() {
  const [zoom, setZoom] = useState(2);
  const [clicks, setClicks] = useState(0);

  useMapZoom(setZoom);
  useMapEvent('click', () => setClicks(c => c + 1));

  return (
    <MapOverlay position="top-left">
      <div className="bg-black/80 text-white p-4 rounded">
        <p>Zoom: {Math.round(zoom)}</p>
        <p>Clicks: {clicks}</p>
      </div>
    </MapOverlay>
  );
}

export default function MapPage() {
  return (
    <div className="h-screen">
      <MapContainer>
        <MapStats />
      </MapContainer>
    </div>
  );
}
```

## Validation

Run the validation script to ensure everything is set up correctly:

```bash
pnpm validate-task10
```

## Architecture

```
src/
├── components/Map/
│   ├── MapContainer.tsx    # Main container with loading/error states
│   ├── MapboxMap.tsx       # Core Mapbox GL JS initialization
│   ├── index.ts            # Component exports
│   └── README.md           # This file
├── contexts/
│   └── MapContext.tsx      # React context for map instance
├── hooks/
│   └── useMap.ts           # Custom hooks for map interaction
└── lib/
    ├── map-config.ts       # Map configuration and options
    └── map-utils.ts        # Utility functions
```

## Next Steps

- Add custom map styles in Mapbox Studio
- Integrate with vote visualization layers (Deck.gl)
- Add geolocation features
- Implement H3 hexagon overlays

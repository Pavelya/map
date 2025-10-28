'use client';

/**
 * DeckGL Integration Example
 *
 * Complete example showing how to use all Deck.gl components together.
 * This demonstrates:
 * - MapLibre base map
 * - Deck.gl overlay with H3 hexagon layer
 * - Interactive hover tooltip
 * - Layer management
 * - Real-time data updates
 */

import React, { useEffect, useState } from 'react';
import { useMapContext } from '@/contexts/MapContext';
import { DeckGLOverlay } from './DeckGLOverlay';
import { HexagonTooltip } from './HexagonTooltip';
import { useLayerInteraction } from '@/hooks/useLayerInteraction';
import { createH3Layer } from '@/lib/layers/h3-layer';
import { transformAggregateToLayerData } from '@/lib/layers/data-transformer';
import type { VoteAggregate } from '@/services/aggregation-service';
import type { TeamColors } from '@/lib/color-utils';

/**
 * Example usage component
 */
export function DeckGLMapExample() {
  const { map, isLoaded } = useMapContext();

  // Sample team colors (would come from match data in production)
  const teamColors: TeamColors = {
    teamA: '#FF4444', // Red
    teamB: '#4444FF', // Blue
  };

  // Sample team names
  const teamNames = {
    teamA: 'Team Red',
    teamB: 'Team Blue',
  };

  // State for vote data
  const [voteData, setVoteData] = useState<VoteAggregate[]>([]);

  // Layer interaction with tooltip
  const { state, handleHover, handleClick } = useLayerInteraction({
    onHoverChange: (object, position) => {
      // Tooltip is automatically handled by state
      console.log('Hover:', object?.h3Index, position);
    },
    onClickHexagon: (object) => {
      console.log('Clicked hexagon:', object.h3Index);
      // Could show details panel, zoom to location, etc.
    },
    debounceDelay: 50,
  });

  // Transform data for Deck.gl
  const layerData = transformAggregateToLayerData(voteData);

  // Create H3 layer
  const layers: any[] = layerData.length > 0
    ? [
        createH3Layer(layerData, {
          teamColors,
          opacity: 0.6,
          pickable: true,
          transitionDuration: 500,
          dynamicOpacity: true,
        }),
      ]
    : [];

  // Simulate loading data (in production, this would fetch from API)
  useEffect(() => {
    if (!isLoaded) return;

    // Example: Fetch vote aggregates for a match
    const fetchVoteData = async () => {
      try {
        // const response = await fetch(`/api/matches/${matchId}/aggregates`);
        // const data = await response.json();
        // setVoteData(data);

        // For now, use empty data
        setVoteData([]);
      } catch (error) {
        console.error('Failed to fetch vote data:', error);
      }
    };

    fetchVoteData();
  }, [isLoaded]);

  // Don't render until map is ready
  if (!map || !isLoaded) {
    return null;
  }

  return (
    <>
      {/* Deck.gl overlay */}
      <DeckGLOverlay
        map={map}
        layers={layers}
        onHover={handleHover}
        onClick={handleClick}
        getCursor={({ isHovering }) => (isHovering ? 'pointer' : 'grab')}
      />

      {/* Hover tooltip */}
      <HexagonTooltip
        data={state.hoveredObject}
        position={state.hoverPosition}
        teamNames={teamNames}
      />
    </>
  );
}

/**
 * Example with layer manager
 */
export function DeckGLMapWithLayerManager() {
  const { map, isLoaded } = useMapContext();
  const [layers, setLayers] = useState<any[]>([]);

  const teamColors: TeamColors = {
    teamA: '#FF4444',
    teamB: '#4444FF',
  };

  useEffect(() => {
    if (!isLoaded) return;

    // Example: Create multiple layers
    const exampleData = transformAggregateToLayerData([]);

    const mainLayer = createH3Layer(exampleData, {
      id: 'main-hexagons',
      teamColors,
      opacity: 0.6,
    });

    setLayers([mainLayer]);
  }, [isLoaded]);

  if (!map || !isLoaded) {
    return null;
  }

  return <DeckGLOverlay map={map} layers={layers} />;
}

/**
 * Usage in a page component:
 *
 * ```tsx
 * import { MapContainer } from '@/components/Map/MapContainer';
 * import { DeckGLMapExample } from '@/components/Map/DeckGLExample';
 *
 * export default function Page() {
 *   return (
 *     <div className="w-full h-screen">
 *       <MapContainer>
 *         <DeckGLMapExample />
 *       </MapContainer>
 *     </div>
 *   );
 * }
 * ```
 */

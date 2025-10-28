'use client';

/**
 * Hexagon Tooltip Component
 *
 * Displays vote information when hovering over H3 hexagons on the map.
 * Shows team vote counts, percentages, and location details.
 */

import React, { useMemo } from 'react';
import type { H3VoteData } from '@/lib/layers/data-transformer';

/**
 * Tooltip props
 */
export interface HexagonTooltipProps {
  /** Hexagon data to display */
  data: H3VoteData | null;

  /** Cursor position [x, y] in screen coordinates */
  position: [number, number] | null;

  /** Team names for display */
  teamNames?: {
    teamA: string;
    teamB: string;
  };

  /** Additional CSS classes */
  className?: string;

  /** Offset from cursor [x, y] in pixels */
  offset?: [number, number];
}

/**
 * Format number with commas
 *
 * @example
 * formatNumber(1234) // "1,234"
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Format percentage
 *
 * @example
 * formatPercentage(66.67) // "66.7%"
 */
function formatPercentage(percent: number): string {
  return `${percent.toFixed(1)}%`;
}

/**
 * Get location description from H3 index
 *
 * This could be enhanced with reverse geocoding in the future.
 */
function getLocationDescription(_h3Index: string, resolution: number): string {
  // For now, show H3 index and resolution
  // Could be enhanced with city/country lookup
  return `Resolution ${resolution} cell`;
}

/**
 * Hexagon Tooltip Component
 *
 * Displays vote statistics on hover.
 *
 * @example
 * <HexagonTooltip
 *   data={hoveredHexagon}
 *   position={cursorPosition}
 *   teamNames={{ teamA: "Red Team", teamB: "Blue Team" }}
 * />
 */
export function HexagonTooltip({
  data,
  position,
  teamNames = { teamA: 'Team A', teamB: 'Team B' },
  className = '',
  offset = [10, 10],
}: HexagonTooltipProps) {
  // Don't render if no data or position
  if (!data || !position) {
    return null;
  }

  const [x, y] = position;
  const [offsetX, offsetY] = offset;

  // Calculate position style
  const positionStyle: React.CSSProperties = {
    left: `${x + offsetX}px`,
    top: `${y + offsetY}px`,
  };

  // Get location description
  const location = getLocationDescription(data.h3Index, data.resolution);

  // Determine dominant team label
  const dominantTeamLabel = useMemo(() => {
    if (data.dominantTeam === 'team_a') {
      return teamNames.teamA;
    } else if (data.dominantTeam === 'team_b') {
      return teamNames.teamB;
    } else {
      return 'Tied';
    }
  }, [data.dominantTeam, teamNames]);

  // Determine dominant color
  const dominantColor = useMemo(() => {
    if (data.dominantTeam === 'team_a') {
      return 'text-red-400';
    } else if (data.dominantTeam === 'team_b') {
      return 'text-blue-400';
    } else {
      return 'text-gray-400';
    }
  }, [data.dominantTeam]);

  return (
    <div
      className={`fixed z-50 pointer-events-none ${className}`}
      style={positionStyle}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]">
        {/* Header */}
        <div className="mb-2 pb-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{location}</span>
            <span className={`text-xs font-semibold ${dominantColor}`}>
              {dominantTeamLabel}
            </span>
          </div>
        </div>

        {/* Total Votes */}
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Total Votes:</span>
            <span className="text-sm font-bold text-white">
              {formatNumber(data.voteCount)}
            </span>
          </div>
        </div>

        {/* Team A Stats */}
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{teamNames.teamA}:</span>
            <span className="text-xs text-red-400 font-semibold">
              {formatNumber(data.teamACount)} ({formatPercentage(data.teamAPercentage)})
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${data.teamAPercentage}%` }}
            />
          </div>
        </div>

        {/* Team B Stats */}
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{teamNames.teamB}:</span>
            <span className="text-xs text-blue-400 font-semibold">
              {formatNumber(data.teamBCount)} ({formatPercentage(data.teamBPercentage)})
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${data.teamBPercentage}%` }}
            />
          </div>
        </div>

        {/* H3 Index (for debugging) */}
        {process.env['NODE_ENV'] === 'development' && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-500 font-mono truncate">
              {data.h3Index}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple tooltip variant for less detailed display
 */
export function SimpleHexagonTooltip({
  data,
  position,
  offset = [10, 10],
}: Pick<HexagonTooltipProps, 'data' | 'position' | 'offset'>) {
  if (!data || !position) {
    return null;
  }

  const [x, y] = position;
  const [offsetX, offsetY] = offset;

  const positionStyle: React.CSSProperties = {
    left: `${x + offsetX}px`,
    top: `${y + offsetY}px`,
  };

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={positionStyle}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-md shadow-lg px-3 py-2">
        <div className="text-sm font-semibold text-white">
          {formatNumber(data.voteCount)} votes
        </div>
        <div className="text-xs text-gray-400">
          {formatPercentage(data.teamAPercentage)} vs{' '}
          {formatPercentage(data.teamBPercentage)}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing tooltip state
 *
 * @example
 * const { tooltipData, tooltipPosition, updateTooltip, hideTooltip } = useTooltip();
 *
 * // On hover
 * updateTooltip(hexagonData, [x, y]);
 *
 * // On mouse leave
 * hideTooltip();
 */
export function useTooltip() {
  const [tooltipData, setTooltipData] = React.useState<H3VoteData | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<[number, number] | null>(
    null
  );

  const updateTooltip = React.useCallback(
    (data: H3VoteData | null, position: [number, number] | null) => {
      setTooltipData(data);
      setTooltipPosition(position);
    },
    []
  );

  const hideTooltip = React.useCallback(() => {
    setTooltipData(null);
    setTooltipPosition(null);
  }, []);

  return {
    tooltipData,
    tooltipPosition,
    updateTooltip,
    hideTooltip,
  };
}

/**
 * Tooltip container component
 *
 * Renders tooltip at the root level to avoid z-index issues.
 *
 * @example
 * <TooltipContainer
 *   data={tooltipData}
 *   position={tooltipPosition}
 *   teamNames={teamNames}
 * />
 */
export function TooltipContainer({
  data,
  position,
  teamNames = { teamA: 'Team A', teamB: 'Team B' },
  variant = 'detailed',
}: HexagonTooltipProps & { variant?: 'detailed' | 'simple' }) {
  if (variant === 'simple') {
    return <SimpleHexagonTooltip data={data} position={position} />;
  }

  return <HexagonTooltip data={data} position={position} teamNames={teamNames} />;
}

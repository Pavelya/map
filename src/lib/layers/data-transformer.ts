/**
 * Data Transformer for Deck.gl Layers
 *
 * Transforms aggregated vote data from database format to Deck.gl layer format.
 * Handles filtering, sorting, and format conversion for optimal rendering performance.
 */

import type { VoteAggregate } from '@/services/aggregation-service';
import { cellToLatLng } from 'h3-js';

/**
 * H3 vote data format for Deck.gl layers
 */
export interface H3VoteData {
  /** H3 cell index (hexagon identifier) */
  h3Index: string;

  /** H3 resolution level */
  resolution: number;

  /** Center coordinates [lng, lat] */
  coordinates: [number, number];

  /** Team A vote count */
  teamACount: number;

  /** Team B vote count */
  teamBCount: number;

  /** Total vote count */
  voteCount: number;

  /** Dominant team */
  dominantTeam: 'team_a' | 'team_b' | 'tie';

  /** Team A percentage (0-100) */
  teamAPercentage: number;

  /** Team B percentage (0-100) */
  teamBPercentage: number;

  /** Last update timestamp */
  lastUpdated: string;
}

/**
 * Transform aggregated vote data to Deck.gl layer format
 *
 * Converts database aggregate format to the format expected by H3HexagonLayer.
 * Includes team percentages and dominant team calculations.
 *
 * @param aggregates - Raw vote aggregates from database
 * @returns Array of H3 vote data ready for Deck.gl rendering
 *
 * @example
 * const aggregates = await getH3Aggregates(matchId);
 * const layerData = transformAggregateToLayerData(aggregates);
 * // Use layerData in H3HexagonLayer
 */
export function transformAggregateToLayerData(
  aggregates: VoteAggregate[]
): H3VoteData[] {
  const layerData: H3VoteData[] = [];

  for (const aggregate of aggregates) {
    // Only process H3 aggregates (skip country aggregates)
    if (aggregate.aggregateType !== 'h3') {
      continue;
    }

    try {
      // Get center coordinates for the hexagon
      const [lat, lng] = cellToLatLng(aggregate.locationKey);

      // Calculate percentages
      const total = aggregate.teamACount + aggregate.teamBCount;
      const teamAPercentage = total > 0 ? (aggregate.teamACount / total) * 100 : 0;
      const teamBPercentage = total > 0 ? (aggregate.teamBCount / total) * 100 : 0;

      // Determine dominant team
      let dominantTeam: 'team_a' | 'team_b' | 'tie';
      if (aggregate.teamACount > aggregate.teamBCount) {
        dominantTeam = 'team_a';
      } else if (aggregate.teamBCount > aggregate.teamACount) {
        dominantTeam = 'team_b';
      } else {
        dominantTeam = 'tie';
      }

      layerData.push({
        h3Index: aggregate.locationKey,
        resolution: aggregate.resolution || 6,
        coordinates: [lng, lat], // Deck.gl uses [lng, lat] order
        teamACount: aggregate.teamACount,
        teamBCount: aggregate.teamBCount,
        voteCount: aggregate.voteCount,
        dominantTeam,
        teamAPercentage: Math.round(teamAPercentage * 100) / 100,
        teamBPercentage: Math.round(teamBPercentage * 100) / 100,
        lastUpdated: aggregate.lastUpdatedAt,
      });
    } catch (error) {
      // Skip invalid H3 cells
      console.error(`Failed to transform aggregate ${aggregate.locationKey}:`, error);
      continue;
    }
  }

  return layerData;
}

/**
 * Filter layer data by H3 resolution
 *
 * Returns only hexagons at the specified resolution level.
 * Useful for showing different detail levels based on zoom.
 *
 * @param data - H3 vote data
 * @param resolution - Target H3 resolution (4-7)
 * @returns Filtered data at specified resolution
 *
 * @example
 * // Show only coarse resolution at low zoom
 * const coarseData = filterByResolution(data, 4);
 *
 * // Show fine resolution at high zoom
 * const fineData = filterByResolution(data, 7);
 */
export function filterByResolution(
  data: H3VoteData[],
  resolution: number
): H3VoteData[] {
  return data.filter((item) => item.resolution === resolution);
}

/**
 * Filter layer data by minimum vote threshold
 *
 * Only includes hexagons with at least the specified number of votes.
 * Reduces visual clutter and improves performance.
 *
 * @param data - H3 vote data
 * @param minVotes - Minimum vote count (default: 1)
 * @returns Filtered data above threshold
 *
 * @example
 * // Only show hexagons with 10+ votes
 * const significantData = filterByVoteThreshold(data, 10);
 */
export function filterByVoteThreshold(
  data: H3VoteData[],
  minVotes: number = 1
): H3VoteData[] {
  return data.filter((item) => item.voteCount >= minVotes);
}

/**
 * Sort layer data by vote count (descending)
 *
 * Returns data sorted with most votes first.
 * Useful for rendering order - high vote hexagons drawn on top.
 *
 * @param data - H3 vote data
 * @returns Sorted data (most votes first)
 *
 * @example
 * const sortedData = sortByVoteCount(data);
 * // Hottest hexagons render last (on top)
 */
export function sortByVoteCount(data: H3VoteData[]): H3VoteData[] {
  return [...data].sort((a, b) => b.voteCount - a.voteCount);
}

/**
 * Sort layer data by dominant team
 *
 * Groups hexagons by team for better visual organization.
 *
 * @param data - H3 vote data
 * @param teamFirst - Which team to sort first ('team_a' | 'team_b')
 * @returns Sorted data grouped by team
 *
 * @example
 * const teamAFirstData = sortByDominantTeam(data, 'team_a');
 */
export function sortByDominantTeam(
  data: H3VoteData[],
  teamFirst: 'team_a' | 'team_b' = 'team_a'
): H3VoteData[] {
  return [...data].sort((a, b) => {
    // Sort by dominant team first
    if (a.dominantTeam === teamFirst && b.dominantTeam !== teamFirst) return -1;
    if (a.dominantTeam !== teamFirst && b.dominantTeam === teamFirst) return 1;

    // Then by vote count within each group
    return b.voteCount - a.voteCount;
  });
}

/**
 * Get top N hexagons by vote count
 *
 * Returns the most voted hexagons for highlighting or special rendering.
 *
 * @param data - H3 vote data
 * @param limit - Maximum number of hexagons to return (default: 100)
 * @returns Top hexagons by vote count
 *
 * @example
 * // Show top 10 hotspots
 * const topHotspots = getTopHexagons(data, 10);
 */
export function getTopHexagons(data: H3VoteData[], limit: number = 100): H3VoteData[] {
  return sortByVoteCount(data).slice(0, limit);
}

/**
 * Calculate data statistics
 *
 * Returns summary statistics for the dataset.
 * Useful for setting visualization parameters (opacity, thresholds, etc.).
 *
 * @param data - H3 vote data
 * @returns Dataset statistics
 *
 * @example
 * const stats = calculateDataStats(data);
 * console.log(`Max votes in a cell: ${stats.maxVotes}`);
 * // Use stats.averageVotes to set opacity thresholds
 */
export function calculateDataStats(data: H3VoteData[]) {
  if (data.length === 0) {
    return {
      totalHexagons: 0,
      totalVotes: 0,
      averageVotes: 0,
      maxVotes: 0,
      minVotes: 0,
      teamATotal: 0,
      teamBTotal: 0,
      teamALeadingCells: 0,
      teamBLeadingCells: 0,
      tieCells: 0,
    };
  }

  const totalVotes = data.reduce((sum, item) => sum + item.voteCount, 0);
  const teamATotal = data.reduce((sum, item) => sum + item.teamACount, 0);
  const teamBTotal = data.reduce((sum, item) => sum + item.teamBCount, 0);

  const voteCounts = data.map((item) => item.voteCount);
  const maxVotes = Math.max(...voteCounts);
  const minVotes = Math.min(...voteCounts);
  const averageVotes = totalVotes / data.length;

  const teamALeadingCells = data.filter((item) => item.dominantTeam === 'team_a').length;
  const teamBLeadingCells = data.filter((item) => item.dominantTeam === 'team_b').length;
  const tieCells = data.filter((item) => item.dominantTeam === 'tie').length;

  return {
    totalHexagons: data.length,
    totalVotes,
    averageVotes: Math.round(averageVotes * 100) / 100,
    maxVotes,
    minVotes,
    teamATotal,
    teamBTotal,
    teamALeadingCells,
    teamBLeadingCells,
    tieCells,
  };
}

/**
 * Filter data by bounding box
 *
 * Returns only hexagons within the specified geographic bounds.
 * Useful for viewport-based filtering to reduce rendering load.
 *
 * @param data - H3 vote data
 * @param bounds - Bounding box [minLng, minLat, maxLng, maxLat]
 * @returns Filtered data within bounds
 *
 * @example
 * // Only show hexagons in current viewport
 * const viewportData = filterByBounds(data, [
 *   map.getBounds().getWest(),
 *   map.getBounds().getSouth(),
 *   map.getBounds().getEast(),
 *   map.getBounds().getNorth()
 * ]);
 */
export function filterByBounds(
  data: H3VoteData[],
  bounds: [number, number, number, number]
): H3VoteData[] {
  const [minLng, minLat, maxLng, maxLat] = bounds;

  return data.filter((item) => {
    const [lng, lat] = item.coordinates;
    return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
  });
}

/**
 * Merge multiple data sources
 *
 * Combines vote data from multiple sources or resolutions.
 * Useful for progressive data loading or multi-resolution rendering.
 *
 * @param dataSources - Arrays of H3 vote data to merge
 * @returns Merged and deduplicated data
 *
 * @example
 * // Combine cached data with fresh updates
 * const combinedData = mergeDataSources([cachedData, newData]);
 */
export function mergeDataSources(...dataSources: H3VoteData[][]): H3VoteData[] {
  const mergedMap = new Map<string, H3VoteData>();

  for (const dataSource of dataSources) {
    for (const item of dataSource) {
      // Use h3Index as unique key
      // Later sources override earlier ones (fresh data wins)
      mergedMap.set(item.h3Index, item);
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Create empty data array for initialization
 *
 * Returns an empty array with the correct type.
 * Useful for initial state in components.
 *
 * @example
 * const [data, setData] = useState(createEmptyData());
 */
export function createEmptyData(): H3VoteData[] {
  return [];
}

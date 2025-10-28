import { gridDisk, cellToLatLng, latLngToCell } from 'h3-js';
import { logger } from '@/lib/logger';
import type { VoteAggregate } from '@/services/aggregation-service';

export interface Vote {
  h3Index: string;
  h3Resolution: number;
  teamChoice: 'team_a' | 'team_b';
  lat?: number;
  lng?: number;
}

export interface MapLayerAggregate {
  h3Index: string;
  lat: number;
  lng: number;
  resolution: number;
  teamACount: number;
  teamBCount: number;
  totalVotes: number;
  dominantTeam: 'team_a' | 'team_b' | 'tie';
  dominancePercentage: number;
}

export interface DominanceResult {
  dominantTeam: 'team_a' | 'team_b' | 'tie';
  teamAPercentage: number;
  teamBPercentage: number;
  dominancePercentage: number;
}

/**
 * Calculate H3 neighbors for a given cell
 */
export function calculateH3Neighbors(h3Index: string, ringSize: number = 1): string[] {
  try {
    logger.debug('Calculating H3 neighbors', { h3Index, ringSize });
    
    const neighbors = gridDisk(h3Index, ringSize);
    
    logger.debug('H3 neighbors calculated', { 
      h3Index, 
      ringSize, 
      neighborCount: neighbors.length 
    });
    
    return neighbors;
  } catch (error) {
    logger.error('Error calculating H3 neighbors', { error, h3Index, ringSize });
    return [];
  }
}

/**
 * Aggregate votes by H3 resolution
 */
export function aggregateByResolution(votes: Vote[], targetResolution: number): Map<string, {
  teamACount: number;
  teamBCount: number;
  votes: Vote[];
}> {
  try {
    logger.debug('Aggregating votes by resolution', { 
      voteCount: votes.length, 
      targetResolution 
    });

    const aggregates = new Map<string, {
      teamACount: number;
      teamBCount: number;
      votes: Vote[];
    }>();

    for (const vote of votes) {
      let h3Index = vote.h3Index;
      
      // Convert to target resolution if needed
      if (vote.h3Resolution !== targetResolution) {
        if (vote.lat !== undefined && vote.lng !== undefined) {
          h3Index = latLngToCell(vote.lat, vote.lng, targetResolution);
        } else {
          // Convert from current resolution to target resolution
          const [lat, lng] = cellToLatLng(vote.h3Index);
          h3Index = latLngToCell(lat, lng, targetResolution);
        }
      }

      if (!aggregates.has(h3Index)) {
        aggregates.set(h3Index, {
          teamACount: 0,
          teamBCount: 0,
          votes: []
        });
      }

      const aggregate = aggregates.get(h3Index)!;
      if (vote.teamChoice === 'team_a') {
        aggregate.teamACount++;
      } else {
        aggregate.teamBCount++;
      }
      aggregate.votes.push(vote);
    }

    logger.debug('Vote aggregation completed', { 
      inputVotes: votes.length,
      outputCells: aggregates.size,
      targetResolution
    });

    return aggregates;
  } catch (error) {
    logger.error('Error aggregating votes by resolution', { 
      error, 
      voteCount: votes.length, 
      targetResolution 
    });
    return new Map();
  }
}

/**
 * Calculate team dominance from vote counts
 */
export function calculateDominance(teamACount: number, teamBCount: number): DominanceResult {
  const totalVotes = teamACount + teamBCount;
  
  if (totalVotes === 0) {
    return {
      dominantTeam: 'tie',
      teamAPercentage: 0,
      teamBPercentage: 0,
      dominancePercentage: 0
    };
  }

  const teamAPercentage = (teamACount / totalVotes) * 100;
  const teamBPercentage = (teamBCount / totalVotes) * 100;

  let dominantTeam: 'team_a' | 'team_b' | 'tie';
  let dominancePercentage: number;

  if (teamACount > teamBCount) {
    dominantTeam = 'team_a';
    dominancePercentage = teamAPercentage;
  } else if (teamBCount > teamACount) {
    dominantTeam = 'team_b';
    dominancePercentage = teamBPercentage;
  } else {
    dominantTeam = 'tie';
    dominancePercentage = 50;
  }

  return {
    dominantTeam,
    teamAPercentage: Math.round(teamAPercentage * 100) / 100,
    teamBPercentage: Math.round(teamBPercentage * 100) / 100,
    dominancePercentage: Math.round(dominancePercentage * 100) / 100
  };
}

/**
 * Format aggregate data for map layer display
 */
export function formatAggregateForMap(aggregate: VoteAggregate): MapLayerAggregate | null {
  try {
    if (aggregate.aggregateType !== 'h3') {
      return null;
    }

    const [lat, lng] = cellToLatLng(aggregate.locationKey);
    const dominance = calculateDominance(aggregate.teamACount, aggregate.teamBCount);

    return {
      h3Index: aggregate.locationKey,
      lat,
      lng,
      resolution: aggregate.resolution || 0,
      teamACount: aggregate.teamACount,
      teamBCount: aggregate.teamBCount,
      totalVotes: aggregate.voteCount,
      dominantTeam: dominance.dominantTeam,
      dominancePercentage: dominance.dominancePercentage
    };
  } catch (error) {
    logger.error('Error formatting aggregate for map', { error, aggregate });
    return null;
  }
}

/**
 * Format multiple aggregates for map display
 */
export function formatAggregatesForMap(aggregates: VoteAggregate[]): MapLayerAggregate[] {
  const mapAggregates: MapLayerAggregate[] = [];

  for (const aggregate of aggregates) {
    const formatted = formatAggregateForMap(aggregate);
    if (formatted) {
      mapAggregates.push(formatted);
    }
  }

  logger.debug('Formatted aggregates for map', { 
    inputCount: aggregates.length,
    outputCount: mapAggregates.length
  });

  return mapAggregates;
}

/**
 * Filter aggregates by minimum vote threshold
 */
export function filterAggregatesByThreshold(
  aggregates: VoteAggregate[], 
  minVotes: number = 1
): VoteAggregate[] {
  const filtered = aggregates.filter(agg => agg.voteCount >= minVotes);
  
  logger.debug('Filtered aggregates by threshold', {
    inputCount: aggregates.length,
    outputCount: filtered.length,
    minVotes
  });

  return filtered;
}

/**
 * Get top aggregates by vote count
 */
export function getTopAggregates(
  aggregates: VoteAggregate[], 
  limit: number = 100
): VoteAggregate[] {
  const sorted = [...aggregates]
    .sort((a, b) => b.voteCount - a.voteCount)
    .slice(0, limit);

  logger.debug('Got top aggregates', {
    inputCount: aggregates.length,
    outputCount: sorted.length,
    limit
  });

  return sorted;
}
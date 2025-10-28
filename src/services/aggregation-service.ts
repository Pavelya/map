import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';

const supabase = createClient(
  process.env['NEXT_PUBLIC_SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
);

export interface VoteAggregate {
  aggregateType: 'h3' | 'country';
  locationKey: string;
  resolution?: number;
  teamACount: number;
  teamBCount: number;
  voteCount: number;
  lastUpdatedAt: string;
}

export interface MatchStats {
  totalVotes: number;
  teamAVotes: number;
  teamBVotes: number;
  uniqueCountries: number;
  uniqueH3Cells: number;
  lastVoteAt: string | null;
}

export interface BulkVote {
  matchId: string;
  h3Index: string;
  h3Resolution: number;
  countryCode?: string;
  teamChoice: 'team_a' | 'team_b';
}

class AggregationService {
  /**
   * Update H3 aggregate atomically
   */
  async updateH3Aggregate(
    matchId: string,
    h3Index: string,
    resolution: number,
    teamChoice: 'team_a' | 'team_b'
  ): Promise<void> {
    try {
      logger.info('Updating H3 aggregate', {
        matchId,
        h3Index,
        resolution,
        teamChoice
      });

      const { error } = await supabase.rpc('increment_h3_aggregate', {
        p_match_id: matchId,
        p_h3_index: h3Index,
        p_h3_resolution: resolution,
        p_team_choice: teamChoice
      });

      if (error) {
        logger.error('Failed to update H3 aggregate', { error, matchId, h3Index });
        throw new Error(`H3 aggregate update failed: ${error.message}`);
      }

      // Invalidate cache
      await cache.invalidateMatchAggregates(matchId);
      await cache.invalidateMatchStats(matchId);

      logger.debug('H3 aggregate updated successfully', { matchId, h3Index });
    } catch (error) {
      logger.error('Error updating H3 aggregate', { error, matchId, h3Index });
      throw error;
    }
  }

  /**
   * Update country aggregate atomically
   */
  async updateCountryAggregate(
    matchId: string,
    countryCode: string,
    teamChoice: 'team_a' | 'team_b'
  ): Promise<void> {
    try {
      logger.info('Updating country aggregate', {
        matchId,
        countryCode,
        teamChoice
      });

      const { error } = await supabase.rpc('increment_country_aggregate', {
        p_match_id: matchId,
        p_country_code: countryCode,
        p_team_choice: teamChoice
      });

      if (error) {
        logger.error('Failed to update country aggregate', { error, matchId, countryCode });
        throw new Error(`Country aggregate update failed: ${error.message}`);
      }

      // Invalidate cache
      await cache.invalidateMatchAggregates(matchId);
      await cache.invalidateMatchStats(matchId);

      logger.debug('Country aggregate updated successfully', { matchId, countryCode });
    } catch (error) {
      logger.error('Error updating country aggregate', { error, matchId, countryCode });
      throw error;
    }
  }

  /**
   * Get all aggregates for a match (with caching)
   */
  async getMatchAggregates(matchId: string): Promise<VoteAggregate[]> {
    try {
      // Try cache first
      const cached = await cache.getMatchAggregates(matchId);
      if (cached) {
        logger.debug('Returning cached match aggregates', { matchId });
        return cached;
      }

      logger.info('Fetching match aggregates from database', { matchId });

      const { data, error } = await supabase.rpc('get_match_aggregates', {
        p_match_id: matchId
      });

      if (error) {
        logger.error('Failed to fetch match aggregates', { error, matchId });
        throw new Error(`Failed to fetch aggregates: ${error.message}`);
      }

      const aggregates: VoteAggregate[] = (data || []).map((row: any) => ({
        aggregateType: row.aggregate_type as 'h3' | 'country',
        locationKey: row.location_key,
        resolution: row.resolution || undefined,
        teamACount: row.team_a_count,
        teamBCount: row.team_b_count,
        voteCount: row.vote_count,
        lastUpdatedAt: row.last_updated_at
      }));

      // Cache the results
      await cache.setMatchAggregates(matchId, aggregates);

      logger.debug('Match aggregates fetched successfully', { 
        matchId, 
        count: aggregates.length 
      });

      return aggregates;
    } catch (error) {
      logger.error('Error fetching match aggregates', { error, matchId });
      throw error;
    }
  }

  /**
   * Get realtime statistics for a match (with caching)
   */
  async getRealtimeStats(matchId: string): Promise<MatchStats> {
    try {
      // Try cache first
      const cached = await cache.getMatchStats(matchId);
      if (cached) {
        logger.debug('Returning cached match stats', { matchId });
        return cached;
      }

      logger.info('Fetching match stats from database', { matchId });

      const { data, error } = await supabase.rpc('get_realtime_stats', {
        p_match_id: matchId
      });

      if (error) {
        logger.error('Failed to fetch match stats', { error, matchId });
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      const row = data?.[0];
      if (!row) {
        // Return empty stats if no data
        const emptyStats: MatchStats = {
          totalVotes: 0,
          teamAVotes: 0,
          teamBVotes: 0,
          uniqueCountries: 0,
          uniqueH3Cells: 0,
          lastVoteAt: null
        };
        await cache.setMatchStats(matchId, emptyStats);
        return emptyStats;
      }

      const stats: MatchStats = {
        totalVotes: parseInt(row.total_votes) || 0,
        teamAVotes: parseInt(row.team_a_votes) || 0,
        teamBVotes: parseInt(row.team_b_votes) || 0,
        uniqueCountries: row.unique_countries || 0,
        uniqueH3Cells: row.unique_h3_cells || 0,
        lastVoteAt: row.last_vote_at || null
      };

      // Cache the results
      await cache.setMatchStats(matchId, stats);

      logger.debug('Match stats fetched successfully', { matchId, stats });

      return stats;
    } catch (error) {
      logger.error('Error fetching match stats', { error, matchId });
      throw error;
    }
  }

  /**
   * Bulk update aggregates for high throughput
   */
  async bulkUpdateAggregates(votes: BulkVote[]): Promise<void> {
    try {
      logger.info('Processing bulk aggregate updates', { count: votes.length });

      // Group votes by match for efficient processing
      const votesByMatch = votes.reduce((acc, vote) => {
        if (!acc[vote.matchId]) {
          acc[vote.matchId] = [];
        }
        acc[vote.matchId]!.push(vote);
        return acc;
      }, {} as Record<string, BulkVote[]>);

      // Process each match's votes in parallel
      const promises = Object.entries(votesByMatch).map(async ([matchId, matchVotes]) => {
        logger.debug('Processing votes for match', { matchId, count: matchVotes.length });

        // Process H3 and country updates in parallel for each vote
        const updatePromises = matchVotes.map(async (vote) => {
          const h3Promise = this.updateH3Aggregate(
            vote.matchId,
            vote.h3Index,
            vote.h3Resolution,
            vote.teamChoice
          );

          const countryPromise = vote.countryCode
            ? this.updateCountryAggregate(vote.matchId, vote.countryCode, vote.teamChoice)
            : Promise.resolve();

          await Promise.all([h3Promise, countryPromise]);
        });

        await Promise.all(updatePromises);
      });

      await Promise.all(promises);

      logger.info('Bulk aggregate updates completed successfully', { 
        totalVotes: votes.length,
        matchCount: Object.keys(votesByMatch).length
      });
    } catch (error) {
      logger.error('Error in bulk aggregate updates', { error, voteCount: votes.length });
      throw error;
    }
  }
}

export const aggregationService = new AggregationService();
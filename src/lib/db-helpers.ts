import { supabase } from './db';
import { logger } from './logger';

// Types for database entities
export interface Match {
  id: string;
  team_a_name: string;
  team_a_color: string;
  team_a_logo_url?: string;
  team_b_name: string;
  team_b_color: string;
  team_b_logo_url?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';
  allow_precise_geo: boolean;
  require_captcha: boolean;
  max_votes_per_user: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VoteCount {
  count: number;
}

export interface VoteAggregateResult {
  success: boolean;
  team_a_count: number;
  team_b_count: number;
  vote_count: number;
}

/**
 * Get the currently active match
 * @returns Promise<Match | null> - The active match or null if none exists
 */
export async function getActiveMatch(): Promise<Match | null> {
  try {
    logger.info('Fetching active match from database');

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'active')
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - no active match
        logger.info('No active match found');
        return null;
      }
      throw error;
    }

    logger.info(`Active match found: ${data.title} (${data.id})`);
    return data as Match;
  } catch (error) {
    logger.error('Error fetching active match:', error);
    throw new Error(`Failed to get active match: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the count of votes for a specific user (by fingerprint) in a match
 * @param fingerprintHash - The hashed fingerprint of the user
 * @param matchId - The UUID of the match
 * @returns Promise<number> - The number of votes cast by this user for this match
 */
export async function getUserVoteCount(fingerprintHash: string, matchId: string): Promise<number> {
  try {
    logger.debug(`Getting vote count for fingerprint ${fingerprintHash.substring(0, 8)}... in match ${matchId}`);

    const { data, error } = await supabase
      .from('votes_raw')
      .select('id', { count: 'exact' })
      .eq('fingerprint_hash', fingerprintHash)
      .eq('match_id', matchId)
      .eq('deleted', false);

    if (error) {
      throw error;
    }

    const count = data?.length || 0;
    logger.debug(`User has cast ${count} votes in match ${matchId}`);
    return count;
  } catch (error) {
    logger.error('Error getting user vote count:', error);
    throw new Error(`Failed to get user vote count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Atomically increment vote aggregate for H3 index
 * @param matchId - The UUID of the match
 * @param h3Index - The H3 index string
 * @param h3Resolution - The H3 resolution level
 * @param teamChoice - Which team was voted for ('team_a' or 'team_b')
 * @returns Promise<VoteAggregateResult> - The updated aggregate counts
 */
export async function incrementVoteAggregate(
  matchId: string,
  h3Index: string,
  h3Resolution: number,
  teamChoice: 'team_a' | 'team_b'
): Promise<VoteAggregateResult> {
  try {
    logger.debug(`Incrementing vote aggregate for H3 ${h3Index} (res ${h3Resolution}) in match ${matchId}, team: ${teamChoice}`);

    // Use upsert to handle both insert and update cases atomically

    // First, try to get existing record
    const { data: existing, error: selectError } = await supabase
      .from('vote_agg_h3')
      .select('team_a_count, team_b_count')
      .eq('match_id', matchId)
      .eq('h3_index', h3Index)
      .eq('h3_resolution', h3Resolution)
      .single();

    let newTeamACount = 0;
    let newTeamBCount = 0;

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (existing) {
      // Update existing record
      newTeamACount = existing.team_a_count + (teamChoice === 'team_a' ? 1 : 0);
      newTeamBCount = existing.team_b_count + (teamChoice === 'team_b' ? 1 : 0);
    } else {
      // New record
      newTeamACount = teamChoice === 'team_a' ? 1 : 0;
      newTeamBCount = teamChoice === 'team_b' ? 1 : 0;
    }

    // Upsert the record
    const { data, error } = await supabase
      .from('vote_agg_h3')
      .upsert({
        match_id: matchId,
        h3_index: h3Index,
        h3_resolution: h3Resolution,
        team_a_count: newTeamACount,
        team_b_count: newTeamBCount,
        last_updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,h3_index,h3_resolution'
      })
      .select('team_a_count, team_b_count, vote_count')
      .single();

    if (error) {
      throw error;
    }

    const result: VoteAggregateResult = {
      success: true,
      team_a_count: data.team_a_count,
      team_b_count: data.team_b_count,
      vote_count: data.vote_count
    };

    logger.debug(`Vote aggregate updated: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logger.error('Error incrementing vote aggregate:', error);
    throw new Error(`Failed to increment vote aggregate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Atomically increment country-level vote aggregate
 * @param matchId - The UUID of the match
 * @param countryCode - The ISO 2-letter country code
 * @param teamChoice - Which team was voted for ('team_a' or 'team_b')
 * @returns Promise<VoteAggregateResult> - The updated aggregate counts
 */
export async function incrementCountryVoteAggregate(
  matchId: string,
  countryCode: string,
  teamChoice: 'team_a' | 'team_b'
): Promise<VoteAggregateResult> {
  try {
    logger.debug(`Incrementing country vote aggregate for ${countryCode} in match ${matchId}, team: ${teamChoice}`);

    // Get existing record
    const { data: existing, error: selectError } = await supabase
      .from('vote_agg_country')
      .select('team_a_count, team_b_count')
      .eq('match_id', matchId)
      .eq('country_code', countryCode)
      .single();

    let newTeamACount = 0;
    let newTeamBCount = 0;

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (existing) {
      // Update existing record
      newTeamACount = existing.team_a_count + (teamChoice === 'team_a' ? 1 : 0);
      newTeamBCount = existing.team_b_count + (teamChoice === 'team_b' ? 1 : 0);
    } else {
      // New record
      newTeamACount = teamChoice === 'team_a' ? 1 : 0;
      newTeamBCount = teamChoice === 'team_b' ? 1 : 0;
    }

    // Upsert the record
    const { data, error } = await supabase
      .from('vote_agg_country')
      .upsert({
        match_id: matchId,
        country_code: countryCode,
        team_a_count: newTeamACount,
        team_b_count: newTeamBCount,
        last_updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,country_code'
      })
      .select('team_a_count, team_b_count, vote_count')
      .single();

    if (error) {
      throw error;
    }

    const result: VoteAggregateResult = {
      success: true,
      team_a_count: data.team_a_count,
      team_b_count: data.team_b_count,
      vote_count: data.vote_count
    };

    logger.debug(`Country vote aggregate updated: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    logger.error('Error incrementing country vote aggregate:', error);
    throw new Error(`Failed to increment country vote aggregate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get vote aggregates for a match by H3 resolution
 * @param matchId - The UUID of the match
 * @param h3Resolution - The H3 resolution level to filter by
 * @returns Promise<Array> - Array of vote aggregates
 */
export async function getVoteAggregatesByResolution(matchId: string, h3Resolution: number) {
  try {
    logger.debug(`Getting vote aggregates for match ${matchId} at H3 resolution ${h3Resolution}`);

    const { data, error } = await supabase
      .from('vote_agg_h3')
      .select('*')
      .eq('match_id', matchId)
      .eq('h3_resolution', h3Resolution)
      .order('vote_count', { ascending: false });

    if (error) {
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} vote aggregates`);
    return data || [];
  } catch (error) {
    logger.error('Error getting vote aggregates by resolution:', error);
    throw new Error(`Failed to get vote aggregates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get country-level vote aggregates for a match
 * @param matchId - The UUID of the match
 * @returns Promise<Array> - Array of country vote aggregates
 */
export async function getCountryVoteAggregates(matchId: string) {
  try {
    logger.debug(`Getting country vote aggregates for match ${matchId}`);

    const { data, error } = await supabase
      .from('vote_agg_country')
      .select('*')
      .eq('match_id', matchId)
      .order('vote_count', { ascending: false });

    if (error) {
      throw error;
    }

    logger.debug(`Found ${data?.length || 0} country vote aggregates`);
    return data || [];
  } catch (error) {
    logger.error('Error getting country vote aggregates:', error);
    throw new Error(`Failed to get country vote aggregates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
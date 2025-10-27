import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAction } from './audit-service';
import type { MatchData, MatchUpdateData, MatchFilters } from '@/lib/validations/match';

export interface Match {
  id: string;
  teamAName: string;
  teamAColor: string;
  teamALogoUrl?: string;
  teamBName: string;
  teamBColor: string;
  teamBLogoUrl?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'draft' | 'scheduled' | 'active' | 'ended' | 'cancelled';
  allowPreciseGeo: boolean;
  requireCaptcha: boolean;
  maxVotesPerUser: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface MatchStats {
  totalVotes: number;
  teamAVotes: number;
  teamBVotes: number;
  uniqueVoters: number;
  countryBreakdown: Array<{
    countryCode: string;
    teamACount: number;
    teamBCount: number;
    totalCount: number;
  }>;
}

export interface MatchServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Create a new match
 */
export async function createMatch(
  data: MatchData,
  adminId: string,
  ipAddress?: string
): Promise<MatchServiceResult<Match>> {
  try {
    logger.info('Creating new match', {
      adminId,
      title: data.title,
      teamAName: data.teamAName,
      teamBName: data.teamBName,
      startTime: data.startTime,
      endTime: data.endTime
    });

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        team_a_name: data.teamAName,
        team_a_color: data.teamAColor,
        team_a_logo_url: data.teamALogoUrl,
        team_b_name: data.teamBName,
        team_b_color: data.teamBColor,
        team_b_logo_url: data.teamBLogoUrl,
        title: data.title,
        description: data.description,
        start_time: data.startTime,
        end_time: data.endTime,
        status: data.status,
        allow_precise_geo: data.allowPreciseGeo,
        require_captcha: data.requireCaptcha,
        max_votes_per_user: data.maxVotesPerUser,
        created_by: adminId
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create match', {
        adminId,
        error: error.message,
        data
      });
      return {
        success: false,
        error: error.message,
        code: 'CREATE_FAILED'
      };
    }

    const createdMatch = formatMatchFromDB(match);

    // Log audit action
    await logAction(
      adminId,
      'CREATE',
      'match',
      createdMatch.id,
      { match: createdMatch },
      ipAddress
    );

    logger.info('Match created successfully', {
      adminId,
      matchId: createdMatch.id,
      title: createdMatch.title
    });

    return {
      success: true,
      data: createdMatch
    };
  } catch (error) {
    logger.error('Error creating match', {
      adminId,
      error: error instanceof Error ? error.message : 'Unknown error',
      data
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Update an existing match
 */
export async function updateMatch(
  matchId: string,
  data: MatchUpdateData,
  adminId: string,
  ipAddress?: string
): Promise<MatchServiceResult<Match>> {
  try {
    logger.info('Updating match', {
      adminId,
      matchId,
      updateFields: Object.keys(data)
    });

    // Get current match for audit log
    const { data: currentMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!currentMatch) {
      return {
        success: false,
        error: 'Match not found',
        code: 'NOT_FOUND'
      };
    }

    // Build update object
    const updateData: any = {};
    if (data.teamAName !== undefined) updateData.team_a_name = data.teamAName;
    if (data.teamAColor !== undefined) updateData.team_a_color = data.teamAColor;
    if (data.teamALogoUrl !== undefined) updateData.team_a_logo_url = data.teamALogoUrl;
    if (data.teamBName !== undefined) updateData.team_b_name = data.teamBName;
    if (data.teamBColor !== undefined) updateData.team_b_color = data.teamBColor;
    if (data.teamBLogoUrl !== undefined) updateData.team_b_logo_url = data.teamBLogoUrl;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime !== undefined) updateData.start_time = data.startTime;
    if (data.endTime !== undefined) updateData.end_time = data.endTime;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.allowPreciseGeo !== undefined) updateData.allow_precise_geo = data.allowPreciseGeo;
    if (data.requireCaptcha !== undefined) updateData.require_captcha = data.requireCaptcha;
    if (data.maxVotesPerUser !== undefined) updateData.max_votes_per_user = data.maxVotesPerUser;

    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update match', {
        adminId,
        matchId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'UPDATE_FAILED'
      };
    }

    const formattedMatch = formatMatchFromDB(updatedMatch);

    // Log audit action
    await logAction(
      adminId,
      'UPDATE',
      'match',
      matchId,
      {
        before: formatMatchFromDB(currentMatch),
        after: formattedMatch,
        changes: data
      },
      ipAddress
    );

    logger.info('Match updated successfully', {
      adminId,
      matchId,
      updateFields: Object.keys(data)
    });

    return {
      success: true,
      data: formattedMatch
    };
  } catch (error) {
    logger.error('Error updating match', {
      adminId,
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Delete a match (soft delete)
 */
export async function deleteMatch(
  matchId: string,
  adminId: string,
  ipAddress?: string
): Promise<MatchServiceResult<void>> {
  try {
    logger.info('Deleting match', { adminId, matchId });

    // Get current match for audit log
    const { data: currentMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!currentMatch) {
      return {
        success: false,
        error: 'Match not found',
        code: 'NOT_FOUND'
      };
    }

    // Check if match can be deleted (not active)
    if (currentMatch.status === 'active') {
      return {
        success: false,
        error: 'Cannot delete active match',
        code: 'MATCH_ACTIVE'
      };
    }

    // Soft delete by setting status to cancelled
    const { error } = await supabase
      .from('matches')
      .update({ status: 'cancelled' })
      .eq('id', matchId);

    if (error) {
      logger.error('Failed to delete match', {
        adminId,
        matchId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'DELETE_FAILED'
      };
    }

    // Log audit action
    await logAction(
      adminId,
      'DELETE',
      'match',
      matchId,
      { match: formatMatchFromDB(currentMatch) },
      ipAddress
    );

    logger.info('Match deleted successfully', { adminId, matchId });

    return { success: true };
  } catch (error) {
    logger.error('Error deleting match', {
      adminId,
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Get a single match by ID
 */
export async function getMatch(matchId: string): Promise<MatchServiceResult<Match>> {
  try {
    logger.info('Fetching match', { matchId });

    const { data: match, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Match not found',
          code: 'NOT_FOUND'
        };
      }
      logger.error('Failed to fetch match', {
        matchId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'FETCH_FAILED'
      };
    }

    const formattedMatch = formatMatchFromDB(match);

    logger.info('Match fetched successfully', {
      matchId,
      title: formattedMatch.title,
      status: formattedMatch.status
    });

    return {
      success: true,
      data: formattedMatch
    };
  } catch (error) {
    logger.error('Error fetching match', {
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * List matches with filters and pagination
 */
export async function listMatches(filters: MatchFilters = { page: 1, limit: 20 }): Promise<MatchServiceResult<{
  matches: Match[];
  total: number;
  page: number;
  limit: number;
}>> {
  try {
    const { status, page = 1, limit = 20, search } = filters;

    logger.info('Listing matches', { filters });

    let query = supabase
      .from('matches')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,team_a_name.ilike.%${search}%,team_b_name.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list matches', {
        filters,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'LIST_FAILED'
      };
    }

    const matches = (data || []).map(formatMatchFromDB);

    logger.info('Matches listed successfully', {
      filters,
      resultCount: matches.length,
      total: count || 0
    });

    return {
      success: true,
      data: {
        matches,
        total: count || 0,
        page,
        limit
      }
    };
  } catch (error) {
    logger.error('Error listing matches', {
      filters,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Activate a match
 */
export async function activateMatch(
  matchId: string,
  adminId: string,
  ipAddress?: string
): Promise<MatchServiceResult<Match>> {
  try {
    logger.info('Activating match', { adminId, matchId });

    // Check if there's already an active match
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id, title')
      .eq('status', 'active');

    if (activeMatches && activeMatches.length > 0) {
      return {
        success: false,
        error: 'Another match is already active',
        code: 'MATCH_ALREADY_ACTIVE'
      };
    }

    // Get current match
    const { data: currentMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!currentMatch) {
      return {
        success: false,
        error: 'Match not found',
        code: 'NOT_FOUND'
      };
    }

    if (currentMatch.status === 'active') {
      return {
        success: false,
        error: 'Match is already active',
        code: 'ALREADY_ACTIVE'
      };
    }

    if (currentMatch.status === 'ended' || currentMatch.status === 'cancelled') {
      return {
        success: false,
        error: 'Cannot activate ended or cancelled match',
        code: 'INVALID_STATUS'
      };
    }

    // Update match status to active
    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update({ status: 'active' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to activate match', {
        adminId,
        matchId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'ACTIVATION_FAILED'
      };
    }

    const formattedMatch = formatMatchFromDB(updatedMatch);

    // Log audit action
    await logAction(
      adminId,
      'ACTIVATE',
      'match',
      matchId,
      {
        before: { status: currentMatch.status },
        after: { status: 'active' }
      },
      ipAddress
    );

    logger.info('Match activated successfully', {
      adminId,
      matchId,
      title: formattedMatch.title
    });

    return {
      success: true,
      data: formattedMatch
    };
  } catch (error) {
    logger.error('Error activating match', {
      adminId,
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * End a match
 */
export async function endMatch(
  matchId: string,
  adminId: string,
  ipAddress?: string
): Promise<MatchServiceResult<Match>> {
  try {
    logger.info('Ending match', { adminId, matchId });

    // Get current match
    const { data: currentMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!currentMatch) {
      return {
        success: false,
        error: 'Match not found',
        code: 'NOT_FOUND'
      };
    }

    if (currentMatch.status !== 'active') {
      return {
        success: false,
        error: 'Only active matches can be ended',
        code: 'INVALID_STATUS'
      };
    }

    // Update match status to ended
    const { data: updatedMatch, error } = await supabase
      .from('matches')
      .update({ status: 'ended' })
      .eq('id', matchId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to end match', {
        adminId,
        matchId,
        error: error.message
      });
      return {
        success: false,
        error: error.message,
        code: 'END_FAILED'
      };
    }

    const formattedMatch = formatMatchFromDB(updatedMatch);

    // Log audit action
    await logAction(
      adminId,
      'END',
      'match',
      matchId,
      {
        before: { status: currentMatch.status },
        after: { status: 'ended' }
      },
      ipAddress
    );

    logger.info('Match ended successfully', {
      adminId,
      matchId,
      title: formattedMatch.title
    });

    return {
      success: true,
      data: formattedMatch
    };
  } catch (error) {
    logger.error('Error ending match', {
      adminId,
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Get match statistics
 */
export async function getMatchStats(matchId: string): Promise<MatchServiceResult<MatchStats>> {
  try {
    logger.info('Fetching match stats', { matchId });

    // Get total votes from votes_raw
    const { data: voteData, error: voteError } = await supabase
      .from('votes_raw')
      .select('team_choice, fingerprint_hash')
      .eq('match_id', matchId)
      .eq('deleted', false);

    if (voteError) {
      logger.error('Failed to fetch vote data', {
        matchId,
        error: voteError.message
      });
      return {
        success: false,
        error: voteError.message,
        code: 'STATS_FAILED'
      };
    }

    // Get country breakdown
    const { data: countryData, error: countryError } = await supabase
      .from('vote_agg_country')
      .select('country_code, team_a_count, team_b_count')
      .eq('match_id', matchId);

    if (countryError) {
      logger.error('Failed to fetch country data', {
        matchId,
        error: countryError.message
      });
      return {
        success: false,
        error: countryError.message,
        code: 'STATS_FAILED'
      };
    }

    // Calculate stats
    const teamAVotes = voteData?.filter(v => v.team_choice === 'team_a').length || 0;
    const teamBVotes = voteData?.filter(v => v.team_choice === 'team_b').length || 0;
    const totalVotes = teamAVotes + teamBVotes;
    const uniqueVoters = new Set(voteData?.map(v => v.fingerprint_hash) || []).size;

    const countryBreakdown = (countryData || []).map(country => ({
      countryCode: country.country_code,
      teamACount: country.team_a_count,
      teamBCount: country.team_b_count,
      totalCount: country.team_a_count + country.team_b_count
    }));

    const stats: MatchStats = {
      totalVotes,
      teamAVotes,
      teamBVotes,
      uniqueVoters,
      countryBreakdown
    };

    logger.info('Match stats fetched successfully', {
      matchId,
      totalVotes,
      uniqueVoters,
      countriesCount: countryBreakdown.length
    });

    return {
      success: true,
      data: stats
    };
  } catch (error) {
    logger.error('Error fetching match stats', {
      matchId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      code: 'INTERNAL_ERROR'
    };
  }
}

/**
 * Format match data from database format to API format
 */
function formatMatchFromDB(dbMatch: any): Match {
  return {
    id: dbMatch.id,
    teamAName: dbMatch.team_a_name,
    teamAColor: dbMatch.team_a_color,
    teamALogoUrl: dbMatch.team_a_logo_url,
    teamBName: dbMatch.team_b_name,
    teamBColor: dbMatch.team_b_color,
    teamBLogoUrl: dbMatch.team_b_logo_url,
    title: dbMatch.title,
    description: dbMatch.description,
    startTime: dbMatch.start_time,
    endTime: dbMatch.end_time,
    status: dbMatch.status,
    allowPreciseGeo: dbMatch.allow_precise_geo,
    requireCaptcha: dbMatch.require_captcha,
    maxVotesPerUser: dbMatch.max_votes_per_user,
    createdAt: dbMatch.created_at,
    updatedAt: dbMatch.updated_at,
    createdBy: dbMatch.created_by
  };
}
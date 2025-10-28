import { supabase } from '@/lib/db';
import { logger } from '@/lib/logger';
import { activateMatch, endMatch } from './match-service';

/**
 * Check and activate scheduled matches that should be active now
 */
export async function checkAndActivateMatches(): Promise<void> {
  try {
    const now = new Date().toISOString();

    logger.info('Checking for matches to activate', { currentTime: now });

    // Find scheduled matches that should be active now
    const { data: matchesToActivate, error } = await supabase
      .from('matches')
      .select('id, title, start_time')
      .eq('status', 'scheduled')
      .lte('start_time', now);

    if (error) {
      logger.error('Failed to fetch scheduled matches', { error: error.message });
      return;
    }

    if (!matchesToActivate || matchesToActivate.length === 0) {
      logger.debug('No matches to activate');
      return;
    }

    logger.info('Found matches to activate', { 
      count: matchesToActivate.length,
      matches: matchesToActivate.map(m => ({ id: m.id, title: m.title, startTime: m.start_time }))
    });

    // Check if there's already an active match
    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id, title')
      .eq('status', 'active');

    if (activeMatches && activeMatches.length > 0) {
      logger.warn('Cannot activate matches - another match is already active', {
        activeMatch: activeMatches[0],
        scheduledMatches: matchesToActivate.length
      });
      return;
    }

    // Activate the first match (only one can be active at a time)
    const matchToActivate = matchesToActivate[0];

    if (!matchToActivate) {
      logger.error('No match found to activate despite length check');
      return;
    }

    logger.info('Activating scheduled match', {
      matchId: matchToActivate.id,
      title: matchToActivate.title,
      startTime: matchToActivate.start_time
    });

    // Use system admin ID for automated activation
    const systemAdminId = process.env['SYSTEM_ADMIN_ID'] || '00000000-0000-0000-0000-000000000000';

    const result = await activateMatch(matchToActivate.id, systemAdminId);

    if (result.success) {
      logger.info('Match activated successfully by scheduler', {
        matchId: matchToActivate.id,
        title: matchToActivate.title
      });
    } else {
      logger.error('Failed to activate match via scheduler', {
        matchId: matchToActivate.id,
        title: matchToActivate.title,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Error in checkAndActivateMatches', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Check and end active matches that should be ended now
 */
export async function checkAndEndMatches(): Promise<void> {
  try {
    const now = new Date().toISOString();

    logger.info('Checking for matches to end', { currentTime: now });

    // Find active matches that should be ended now
    const { data: matchesToEnd, error } = await supabase
      .from('matches')
      .select('id, title, end_time')
      .eq('status', 'active')
      .lte('end_time', now);

    if (error) {
      logger.error('Failed to fetch active matches', { error: error.message });
      return;
    }

    if (!matchesToEnd || matchesToEnd.length === 0) {
      logger.debug('No matches to end');
      return;
    }

    logger.info('Found matches to end', { 
      count: matchesToEnd.length,
      matches: matchesToEnd.map(m => ({ id: m.id, title: m.title, endTime: m.end_time }))
    });

    // Use system admin ID for automated ending
    const systemAdminId = process.env['SYSTEM_ADMIN_ID'] || '00000000-0000-0000-0000-000000000000';

    // End all matches that should be ended
    for (const match of matchesToEnd) {
      logger.info('Ending active match', {
        matchId: match.id,
        title: match.title,
        endTime: match.end_time
      });

      const result = await endMatch(match.id, systemAdminId);
      
      if (result.success) {
        logger.info('Match ended successfully by scheduler', {
          matchId: match.id,
          title: match.title
        });
      } else {
        logger.error('Failed to end match via scheduler', {
          matchId: match.id,
          title: match.title,
          error: result.error
        });
      }
    }

  } catch (error) {
    logger.error('Error in checkAndEndMatches', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Schedule match activation for a specific time
 */
export async function scheduleMatchActivation(matchId: string, startTime: string): Promise<void> {
  logger.info('Match activation scheduled', {
    matchId,
    startTime,
    note: 'Will be activated by cron job when time arrives'
  });
  
  // In a production environment, you might want to use a proper job queue
  // like Bull, Agenda, or AWS SQS for more reliable scheduling
  // For now, we rely on the cron job to check and activate matches
}

/**
 * Schedule match end for a specific time
 */
export async function scheduleMatchEnd(matchId: string, endTime: string): Promise<void> {
  logger.info('Match end scheduled', {
    matchId,
    endTime,
    note: 'Will be ended by cron job when time arrives'
  });
  
  // In a production environment, you might want to use a proper job queue
  // like Bull, Agenda, or AWS SQS for more reliable scheduling
  // For now, we rely on the cron job to check and end matches
}

/**
 * Run the match scheduler (called by cron job)
 */
export async function runMatchScheduler(): Promise<void> {
  logger.info('Running match scheduler');
  
  try {
    // First check and end matches that should be ended
    await checkAndEndMatches();
    
    // Then check and activate matches that should be activated
    await checkAndActivateMatches();
    
    logger.info('Match scheduler completed successfully');
  } catch (error) {
    logger.error('Error running match scheduler', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get next scheduled actions for monitoring
 */
export async function getScheduledActions(): Promise<{
  nextActivation?: { matchId: string; title: string; startTime: string };
  nextEnd?: { matchId: string; title: string; endTime: string };
}> {
  try {
    const now = new Date().toISOString();

    // Get next match to activate
    const { data: nextToActivate } = await supabase
      .from('matches')
      .select('id, title, start_time')
      .eq('status', 'scheduled')
      .gt('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1);

    // Get next match to end
    const { data: nextToEnd } = await supabase
      .from('matches')
      .select('id, title, end_time')
      .eq('status', 'active')
      .gt('end_time', now)
      .order('end_time', { ascending: true })
      .limit(1);

    const result: {
      nextActivation?: { matchId: string; title: string; startTime: string };
      nextEnd?: { matchId: string; title: string; endTime: string };
    } = {};

    if (nextToActivate?.[0]) {
      result.nextActivation = {
        matchId: nextToActivate[0].id,
        title: nextToActivate[0].title,
        startTime: nextToActivate[0].start_time
      };
    }

    if (nextToEnd?.[0]) {
      result.nextEnd = {
        matchId: nextToEnd[0].id,
        title: nextToEnd[0].title,
        endTime: nextToEnd[0].end_time
      };
    }

    return result;
  } catch (error) {
    logger.error('Error getting scheduled actions', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {};
  }
}
import type { Match } from '@/services/match-service';

/**
 * Check if a match is currently active
 */
export function isMatchActive(match: Match): boolean {
  if (match.status !== 'active') {
    return false;
  }

  const now = new Date();
  const startTime = new Date(match.startTime);
  const endTime = new Date(match.endTime);

  return now >= startTime && now <= endTime;
}

/**
 * Check if a user can vote in a match
 */
export function canUserVote(match: Match, userVoteCount: number): {
  canVote: boolean;
  reason?: string;
} {
  // Check if match is active
  if (!isMatchActive(match)) {
    return {
      canVote: false,
      reason: 'Match is not currently active'
    };
  }

  // Check vote limit
  if (userVoteCount >= match.maxVotesPerUser) {
    return {
      canVote: false,
      reason: `Maximum votes per user (${match.maxVotesPerUser}) reached`
    };
  }

  return { canVote: true };
}

/**
 * Get time remaining until match ends
 */
export function getMatchTimeRemaining(match: Match): {
  timeRemaining: number; // milliseconds
  isExpired: boolean;
  formattedTime: string;
} {
  const now = new Date();
  const endTime = new Date(match.endTime);
  const timeRemaining = endTime.getTime() - now.getTime();
  const isExpired = timeRemaining <= 0;

  let formattedTime = '';
  if (isExpired) {
    formattedTime = 'Expired';
  } else {
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

    if (hours > 0) {
      formattedTime = `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      formattedTime = `${minutes}m ${seconds}s`;
    } else {
      formattedTime = `${seconds}s`;
    }
  }

  return {
    timeRemaining: Math.max(0, timeRemaining),
    isExpired,
    formattedTime
  };
}

/**
 * Get time until match starts
 */
export function getMatchTimeUntilStart(match: Match): {
  timeUntilStart: number; // milliseconds
  hasStarted: boolean;
  formattedTime: string;
} {
  const now = new Date();
  const startTime = new Date(match.startTime);
  const timeUntilStart = startTime.getTime() - now.getTime();
  const hasStarted = timeUntilStart <= 0;

  let formattedTime = '';
  if (hasStarted) {
    formattedTime = 'Started';
  } else {
    const days = Math.floor(timeUntilStart / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeUntilStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      formattedTime = `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      formattedTime = `${hours}h ${minutes}m`;
    } else {
      formattedTime = `${minutes}m`;
    }
  }

  return {
    timeUntilStart: Math.max(0, timeUntilStart),
    hasStarted,
    formattedTime
  };
}

/**
 * Format match for display in UI
 */
export function formatMatchForDisplay(match: Match): {
  id: string;
  title: string;
  teams: {
    teamA: {
      name: string;
      color: string;
      logoUrl?: string;
    };
    teamB: {
      name: string;
      color: string;
      logoUrl?: string;
    };
  };
  schedule: {
    startTime: string;
    endTime: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    duration: string;
  };
  status: {
    current: string;
    isActive: boolean;
    canVote: boolean;
    timeRemaining?: string;
    timeUntilStart?: string;
  };
  settings: {
    allowPreciseGeo: boolean;
    requireCaptcha: boolean;
    maxVotesPerUser: number;
  };
  description?: string;
} {
  const startTime = new Date(match.startTime);
  const endTime = new Date(match.endTime);
  const duration = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

  const timeRemaining = getMatchTimeRemaining(match);
  const timeUntilStart = getMatchTimeUntilStart(match);
  const active = isMatchActive(match);

  return {
    id: match.id,
    title: match.title,
    teams: {
      teamA: {
        name: match.teamAName,
        color: match.teamAColor,
        logoUrl: match.teamALogoUrl
      },
      teamB: {
        name: match.teamBName,
        color: match.teamBColor,
        logoUrl: match.teamBLogoUrl
      }
    },
    schedule: {
      startTime: match.startTime,
      endTime: match.endTime,
      startTimeFormatted: startTime.toLocaleString(),
      endTimeFormatted: endTime.toLocaleString(),
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`
    },
    status: {
      current: match.status,
      isActive: active,
      canVote: active,
      timeRemaining: active ? timeRemaining.formattedTime : undefined,
      timeUntilStart: !timeUntilStart.hasStarted ? timeUntilStart.formattedTime : undefined
    },
    settings: {
      allowPreciseGeo: match.allowPreciseGeo,
      requireCaptcha: match.requireCaptcha,
      maxVotesPerUser: match.maxVotesPerUser
    },
    description: match.description
  };
}

/**
 * Validate match timing
 */
export function validateMatchTiming(startTime: string, endTime: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const now = new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Check if dates are valid
  if (isNaN(start.getTime())) {
    errors.push('Invalid start time');
  }
  if (isNaN(end.getTime())) {
    errors.push('Invalid end time');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Check if end time is after start time
  if (end <= start) {
    errors.push('End time must be after start time');
  }

  // Check if start time is not too far in the past (allow 5 minutes grace period)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  if (start < fiveMinutesAgo) {
    errors.push('Start time cannot be in the past');
  }

  // Check minimum duration (at least 5 minutes)
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  if (durationMinutes < 5) {
    errors.push('Match duration must be at least 5 minutes');
  }

  // Check maximum duration (24 hours)
  if (durationMinutes > 24 * 60) {
    errors.push('Match duration cannot exceed 24 hours');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get match status color for UI
 */
export function getMatchStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return '#6B7280'; // gray
    case 'scheduled':
      return '#3B82F6'; // blue
    case 'active':
      return '#10B981'; // green
    case 'ended':
      return '#8B5CF6'; // purple
    case 'cancelled':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
}
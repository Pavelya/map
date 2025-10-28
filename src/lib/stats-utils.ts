/**
 * Vote Statistics Utilities
 *
 * Utilities for calculating and formatting vote statistics.
 * Provides functions for percentages, formatting, and analysis.
 */

/**
 * Calculate percentage from part and total
 *
 * @param part - The part value
 * @param total - The total value
 * @returns Percentage (0-100), or 0 if total is 0
 *
 * @example
 * calculatePercentage(50, 100) // 50
 * calculatePercentage(33, 100) // 33
 * calculatePercentage(10, 0)   // 0 (handles division by zero)
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * Format vote count with K/M suffix for large numbers
 *
 * @param count - The vote count to format
 * @returns Formatted string with suffix
 *
 * @example
 * formatVoteCount(500)      // "500"
 * formatVoteCount(1500)     // "1.5K"
 * formatVoteCount(1234567)  // "1.2M"
 * formatVoteCount(50000000) // "50.0M"
 */
export function formatVoteCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }

  if (count < 1000000) {
    const thousands = count / 1000;
    return `${thousands.toFixed(1)}K`;
  }

  const millions = count / 1000000;
  return `${millions.toFixed(1)}M`;
}

/**
 * Format number with commas as thousands separator
 *
 * @param num - The number to format
 * @returns Formatted string with commas
 *
 * @example
 * formatWithCommas(1234)    // "1,234"
 * formatWithCommas(1234567) // "1,234,567"
 * formatWithCommas(42)      // "42"
 */
export function formatWithCommas(num: number): string {
  return num.toLocaleString('en-US');
}

/**
 * Dominance level type
 */
export type DominanceLevel = 'slight' | 'moderate' | 'strong' | 'overwhelming';

/**
 * Get dominance level based on percentage
 *
 * Categorizes team dominance into levels based on their vote percentage.
 *
 * @param percentage - Vote percentage (0-100)
 * @returns Dominance level
 *
 * @example
 * getDominanceLevel(52) // "slight"   (50-59%)
 * getDominanceLevel(65) // "moderate" (60-74%)
 * getDominanceLevel(80) // "strong"   (75-89%)
 * getDominanceLevel(95) // "overwhelming" (90%+)
 */
export function getDominanceLevel(percentage: number): DominanceLevel {
  if (percentage >= 90) return 'overwhelming';
  if (percentage >= 75) return 'strong';
  if (percentage >= 60) return 'moderate';
  return 'slight';
}

/**
 * Stats difference result
 */
export interface StatsDifference {
  difference: number;
  leader: 'team_a' | 'team_b' | 'tie';
  leaderPercentage: number;
  margin: number; // Absolute difference
}

/**
 * Get statistics difference between teams
 *
 * Calculates the vote difference and determines the leading team.
 *
 * @param teamA - Team A vote count
 * @param teamB - Team B vote count
 * @returns Stats difference analysis
 *
 * @example
 * getStatsDifference(150, 100)
 * // {
 * //   difference: 50,
 * //   leader: 'team_a',
 * //   leaderPercentage: 60,
 * //   margin: 50
 * // }
 *
 * getStatsDifference(100, 100)
 * // {
 * //   difference: 0,
 * //   leader: 'tie',
 * //   leaderPercentage: 50,
 * //   margin: 0
 * // }
 */
export function getStatsDifference(teamA: number, teamB: number): StatsDifference {
  const total = teamA + teamB;
  const difference = teamA - teamB;
  const margin = Math.abs(difference);

  let leader: 'team_a' | 'team_b' | 'tie';
  let leaderPercentage: number;

  if (difference > 0) {
    leader = 'team_a';
    leaderPercentage = calculatePercentage(teamA, total);
  } else if (difference < 0) {
    leader = 'team_b';
    leaderPercentage = calculatePercentage(teamB, total);
  } else {
    leader = 'tie';
    leaderPercentage = 50;
  }

  return {
    difference,
    leader,
    leaderPercentage,
    margin
  };
}

/**
 * Calculate split percentages ensuring minimum visibility
 *
 * Returns percentages that ensure both teams are visible (min 5% each)
 * when there are votes for both teams.
 *
 * @param teamA - Team A vote count
 * @param teamB - Team B vote count
 * @param minPercentage - Minimum percentage to show (default: 5)
 * @returns Adjusted percentages [teamAPercent, teamBPercent]
 *
 * @example
 * calculateVisiblePercentages(95, 5)
 * // [95, 5] (both visible at minimum)
 *
 * calculateVisiblePercentages(98, 2)
 * // [95, 5] (adjusted to show both)
 *
 * calculateVisiblePercentages(100, 0)
 * // [100, 0] (no adjustment needed)
 */
export function calculateVisiblePercentages(
  teamA: number,
  teamB: number,
  minPercentage: number = 5
): [number, number] {
  const total = teamA + teamB;

  // Handle edge cases
  if (total === 0) return [50, 50];
  if (teamA === 0) return [0, 100];
  if (teamB === 0) return [100, 0];

  // Calculate raw percentages
  const teamAPercent = (teamA / total) * 100;
  const teamBPercent = (teamB / total) * 100;

  // Check if both have votes and if adjustment is needed
  const bothHaveVotes = teamA > 0 && teamB > 0;

  if (!bothHaveVotes) {
    return [Math.round(teamAPercent), Math.round(teamBPercent)];
  }

  // Apply minimum percentage constraint
  if (teamAPercent < minPercentage) {
    return [minPercentage, 100 - minPercentage];
  }

  if (teamBPercent < minPercentage) {
    return [100 - minPercentage, minPercentage];
  }

  return [Math.round(teamAPercent), Math.round(teamBPercent)];
}

/**
 * Format percentage for display
 *
 * @param percentage - Percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(33.333) // "33.3%"
 * formatPercentage(50)     // "50.0%"
 * formatPercentage(66.7, 0) // "67%"
 */
export function formatPercentage(percentage: number, decimals: number = 1): string {
  return `${percentage.toFixed(decimals)}%`;
}

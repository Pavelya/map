/**
 * PercentageBar Component
 *
 * Displays a horizontal bar showing vote distribution between two teams.
 * Animates width changes smoothly and shows team colors.
 */

import { motion } from 'framer-motion';
import { barSegmentVariants } from '@/lib/animation-variants';
import { calculateVisiblePercentages, formatPercentage } from '@/lib/stats-utils';

export interface PercentageBarProps {
  /**
   * Team A vote count
   */
  teamAVotes: number;

  /**
   * Team B vote count
   */
  teamBVotes: number;

  /**
   * Team A color (hex or CSS color)
   */
  teamAColor: string;

  /**
   * Team B color (hex or CSS color)
   */
  teamBColor: string;

  /**
   * Team A name (for accessibility)
   */
  teamAName: string;

  /**
   * Team B name (for accessibility)
   */
  teamBName: string;

  /**
   * Bar height
   * @default "h-4"
   */
  height?: string;

  /**
   * Show percentages on hover
   * @default true
   */
  showPercentagesOnHover?: boolean;

  /**
   * CSS class name for container
   */
  className?: string;
}

/**
 * PercentageBar
 *
 * Visualizes vote distribution with animated color-coded bar segments.
 * Ensures minimum visibility (5%) for both teams when they have votes.
 *
 * @example
 * ```tsx
 * <PercentageBar
 *   teamAVotes={150}
 *   teamBVotes={100}
 *   teamAColor="#FF4444"
 *   teamBColor="#4444FF"
 *   teamAName="Team Red"
 *   teamBName="Team Blue"
 * />
 * ```
 */
export function PercentageBar({
  teamAVotes,
  teamBVotes,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
  height = 'h-4',
  showPercentagesOnHover = true,
  className = '',
}: PercentageBarProps) {
  const totalVotes = teamAVotes + teamBVotes;

  // Calculate percentages with minimum visibility
  const [teamAPercent, teamBPercent] = calculateVisiblePercentages(
    teamAVotes,
    teamBVotes,
    5 // Minimum 5% width to always show some color
  );

  // Accessibility label
  const ariaLabel = totalVotes === 0
    ? `No votes yet`
    : `${teamAName} ${teamAPercent}%, ${teamBName} ${teamBPercent}%`;

  return (
    <div className={`w-full ${className}`} role="progressbar" aria-label={ariaLabel}>
      <div className={`relative w-full ${height} rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700`}>
        {totalVotes === 0 ? (
          // Empty state
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">No votes yet</span>
          </div>
        ) : (
          // Vote distribution bars
          <div className="flex h-full w-full">
            {/* Team A segment */}
            <motion.div
              custom={`${teamAPercent}%`}
              variants={barSegmentVariants}
              initial="initial"
              animate="animate"
              className="relative group"
              style={{
                backgroundColor: teamAColor,
                width: `${teamAPercent}%`,
              }}
              title={showPercentagesOnHover ? `${teamAName}: ${formatPercentage(teamAPercent)}` : undefined}
            >
              {showPercentagesOnHover && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-white drop-shadow-md">
                    {teamAPercent}%
                  </span>
                </div>
              )}
            </motion.div>

            {/* Team B segment */}
            <motion.div
              custom={`${teamBPercent}%`}
              variants={barSegmentVariants}
              initial="initial"
              animate="animate"
              className="relative group"
              style={{
                backgroundColor: teamBColor,
                width: `${teamBPercent}%`,
              }}
              title={showPercentagesOnHover ? `${teamBName}: ${formatPercentage(teamBPercent)}` : undefined}
            >
              {showPercentagesOnHover && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-semibold text-white drop-shadow-md">
                    {teamBPercent}%
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Percentage labels below bar */}
      {totalVotes > 0 && (
        <div className="flex justify-between mt-1 text-xs text-gray-600 dark:text-gray-400">
          <span>{teamAPercent}%</span>
          <span>{teamBPercent}%</span>
        </div>
      )}
    </div>
  );
}

/**
 * CompactPercentageBar
 *
 * Smaller version without hover tooltips or labels.
 * Useful for inline display or compact layouts.
 *
 * @example
 * ```tsx
 * <CompactPercentageBar
 *   teamAVotes={150}
 *   teamBVotes={100}
 *   teamAColor="#FF4444"
 *   teamBColor="#4444FF"
 * />
 * ```
 */
export function CompactPercentageBar({
  teamAVotes,
  teamBVotes,
  teamAColor,
  teamBColor,
  teamAName,
  teamBName,
  className = '',
}: Omit<PercentageBarProps, 'height' | 'showPercentagesOnHover'>) {
  return (
    <PercentageBar
      teamAVotes={teamAVotes}
      teamBVotes={teamBVotes}
      teamAColor={teamAColor}
      teamBColor={teamBColor}
      teamAName={teamAName}
      teamBName={teamBName}
      height="h-2"
      showPercentagesOnHover={false}
      className={className}
    />
  );
}

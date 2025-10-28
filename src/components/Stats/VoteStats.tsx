/**
 * VoteStats Component
 *
 * Main statistics display component showing real-time vote counts,
 * team distribution, and percentage breakdown.
 * Integrates with Zustand store for state management.
 */

import { motion } from 'framer-motion';
import { useStatsStore } from '@/store/stats-store';
import { AnimatedCounter } from './AnimatedCounter';
import { PercentageBar } from './PercentageBar';
import { fadeInVariants, slideInLeftVariants, slideInRightVariants } from '@/lib/animation-variants';
import { calculatePercentage } from '@/lib/stats-utils';

export interface VoteStatsProps {
  /**
   * Team A name
   */
  teamAName: string;

  /**
   * Team B name
   */
  teamBName: string;

  /**
   * Team A color (hex or CSS color)
   */
  teamAColor: string;

  /**
   * Team B color (hex or CSS color)
   */
  teamBColor: string;

  /**
   * Team A logo URL (optional)
   */
  teamALogoUrl?: string;

  /**
   * Team B logo URL (optional)
   */
  teamBLogoUrl?: string;

  /**
   * Show live indicator
   * @default true
   */
  showLiveIndicator?: boolean;

  /**
   * CSS class name for container
   */
  className?: string;
}

/**
 * VoteStats
 *
 * Displays comprehensive vote statistics with:
 * - Total vote count prominently
 * - Team-specific vote counts with logos and colors
 * - Percentage distribution bar
 * - Responsive layout (stacks on mobile, side-by-side on desktop)
 *
 * @example
 * ```tsx
 * <VoteStats
 *   teamAName="Team Red"
 *   teamBName="Team Blue"
 *   teamAColor="#FF4444"
 *   teamBColor="#4444FF"
 *   teamALogoUrl="/logos/team-a.png"
 *   teamBLogoUrl="/logos/team-b.png"
 * />
 * ```
 */
export function VoteStats({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  teamALogoUrl,
  teamBLogoUrl,
  showLiveIndicator = true,
  className = '',
}: VoteStatsProps) {
  const { teamAVotes, teamBVotes, totalVotes } = useStatsStore();

  const teamAPercent = calculatePercentage(teamAVotes, totalVotes);
  const teamBPercent = calculatePercentage(teamBVotes, totalVotes);

  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}
    >
      {/* Header with total votes */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Total Votes
          </h2>
          {showLiveIndicator && totalVotes > 0 && (
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 2,
                ease: 'easeInOut',
                repeat: Infinity,
              }}
              className="flex items-center gap-1"
            >
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">
                Live
              </span>
            </motion.div>
          )}
        </div>

        <div className="text-5xl font-bold text-gray-900 dark:text-white">
          <AnimatedCounter value={totalVotes} />
        </div>
      </div>

      {/* Team stats - responsive layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Team A */}
        <motion.div
          variants={slideInLeftVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            backgroundColor: `${teamAColor}15`, // 15 is ~8.5% opacity in hex
            borderLeft: `4px solid ${teamAColor}`,
          }}
        >
          {teamALogoUrl && (
            <img
              src={teamALogoUrl}
              alt={`${teamAName} logo`}
              className="w-12 h-12 object-contain"
            />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {teamAName}
            </div>
            <div className="text-2xl font-bold" style={{ color: teamAColor }}>
              <AnimatedCounter value={teamAVotes} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {teamAPercent}% of votes
            </div>
          </div>
        </motion.div>

        {/* Team B */}
        <motion.div
          variants={slideInRightVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{
            backgroundColor: `${teamBColor}15`, // 15 is ~8.5% opacity in hex
            borderLeft: `4px solid ${teamBColor}`,
          }}
        >
          {teamBLogoUrl && (
            <img
              src={teamBLogoUrl}
              alt={`${teamBName} logo`}
              className="w-12 h-12 object-contain"
            />
          )}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {teamBName}
            </div>
            <div className="text-2xl font-bold" style={{ color: teamBColor }}>
              <AnimatedCounter value={teamBVotes} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {teamBPercent}% of votes
            </div>
          </div>
        </motion.div>
      </div>

      {/* Percentage bar */}
      <div className="mt-4">
        <PercentageBar
          teamAVotes={teamAVotes}
          teamBVotes={teamBVotes}
          teamAColor={teamAColor}
          teamBColor={teamBColor}
          teamAName={teamAName}
          teamBName={teamBName}
        />
      </div>
    </motion.div>
  );
}

/**
 * CompactVoteStats
 *
 * Compact version of VoteStats for smaller spaces.
 * Shows only essential information without logos.
 *
 * @example
 * ```tsx
 * <CompactVoteStats
 *   teamAName="Red"
 *   teamBName="Blue"
 *   teamAColor="#FF4444"
 *   teamBColor="#4444FF"
 * />
 * ```
 */
export function CompactVoteStats({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  className = '',
}: Omit<VoteStatsProps, 'teamALogoUrl' | 'teamBLogoUrl' | 'showLiveIndicator'>) {
  const { teamAVotes, teamBVotes, totalVotes } = useStatsStore();

  return (
    <div className={`w-full bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${className}`}>
      {/* Total */}
      <div className="text-center mb-3">
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Total Votes
        </div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          <AnimatedCounter value={totalVotes} />
        </div>
      </div>

      {/* Teams */}
      <div className="flex justify-between items-center mb-3 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: teamAColor }}
          />
          <span className="font-medium">{teamAName}</span>
          <span className="font-bold" style={{ color: teamAColor }}>
            <AnimatedCounter value={teamAVotes} />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold" style={{ color: teamBColor }}>
            <AnimatedCounter value={teamBVotes} />
          </span>
          <span className="font-medium">{teamBName}</span>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: teamBColor }}
          />
        </div>
      </div>

      {/* Bar */}
      <PercentageBar
        teamAVotes={teamAVotes}
        teamBVotes={teamBVotes}
        teamAColor={teamAColor}
        teamBColor={teamBColor}
        teamAName={teamAName}
        teamBName={teamBName}
        height="h-2"
        showPercentagesOnHover={false}
      />
    </div>
  );
}

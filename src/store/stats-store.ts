/**
 * Vote Statistics Store
 *
 * Zustand store for managing real-time vote statistics.
 * Integrates with WebSocket updates for live data synchronization.
 */

import { create } from 'zustand';

export interface VoteStats {
  teamAVotes: number;
  teamBVotes: number;
  totalVotes: number;
  lastUpdate: Date | null;
}

export interface StatsState extends VoteStats {
  setStats: (stats: Partial<VoteStats>) => void;
  incrementTeamA: () => void;
  incrementTeamB: () => void;
  reset: () => void;
}

const initialState: VoteStats = {
  teamAVotes: 0,
  teamBVotes: 0,
  totalVotes: 0,
  lastUpdate: null,
};

/**
 * Vote statistics store
 *
 * Provides centralized state management for vote stats with
 * actions for real-time updates.
 *
 * @example
 * ```tsx
 * const { teamAVotes, teamBVotes, setStats } = useStatsStore();
 *
 * // Update stats from WebSocket
 * setStats({
 *   teamAVotes: 150,
 *   teamBVotes: 100,
 *   totalVotes: 250
 * });
 * ```
 */
export const useStatsStore = create<StatsState>((set) => ({
  ...initialState,

  /**
   * Set statistics from external source (e.g., WebSocket, API)
   */
  setStats: (stats: Partial<VoteStats>) => set((state) => ({
    ...state,
    ...stats,
    lastUpdate: new Date()
  })),

  /**
   * Increment team A vote count
   * Used for optimistic UI updates
   */
  incrementTeamA: () => set((state) => ({
    teamAVotes: state.teamAVotes + 1,
    totalVotes: state.totalVotes + 1,
    lastUpdate: new Date()
  })),

  /**
   * Increment team B vote count
   * Used for optimistic UI updates
   */
  incrementTeamB: () => set((state) => ({
    teamBVotes: state.teamBVotes + 1,
    totalVotes: state.totalVotes + 1,
    lastUpdate: new Date()
  })),

  /**
   * Reset statistics to initial state
   */
  reset: () => set(initialState)
}));

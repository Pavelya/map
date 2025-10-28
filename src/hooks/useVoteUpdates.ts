/**
 * Vote Updates Hook
 *
 * Integrates WebSocket updates with the stats store.
 * Subscribes to vote events and updates statistics in real-time.
 */

import { useEffect } from 'react';
import { useVoteSocket } from './useVoteSocket';
import { useStatsStore } from '@/store/stats-store';
import { logger } from '@/lib/logger';

export interface UseVoteUpdatesOptions {
  /**
   * Match ID to subscribe to
   */
  matchId: string;

  /**
   * Auto-connect on mount
   * @default true
   */
  autoConnect?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

export interface UseVoteUpdatesReturn {
  /**
   * WebSocket connection status
   */
  connected: boolean;

  /**
   * Connection in progress
   */
  connecting: boolean;

  /**
   * Connection error message
   */
  connectionError: string | null;

  /**
   * Manually connect to WebSocket
   */
  connect: () => void;

  /**
   * Manually disconnect from WebSocket
   */
  disconnect: () => void;

  /**
   * Retry connection
   */
  retry: () => void;
}

/**
 * useVoteUpdates
 *
 * Hook that manages WebSocket connection and syncs vote statistics
 * with the Zustand store. Automatically updates stats when new votes
 * come in or when match stats are received.
 *
 * @example
 * ```tsx
 * function VotingPage({ matchId }) {
 *   const { connected, connectionError } = useVoteUpdates({ matchId });
 *
 *   if (connectionError) {
 *     return <ErrorMessage error={connectionError} />;
 *   }
 *
 *   return (
 *     <>
 *       {connected && <LiveIndicator />}
 *       <VoteStats {...matchData} />
 *     </>
 *   );
 * }
 * ```
 */
export function useVoteUpdates({
  matchId,
  autoConnect = true,
  debug = false,
}: UseVoteUpdatesOptions): UseVoteUpdatesReturn {
  const { connected, connecting, stats, connectionError, connect, disconnect, retry } =
    useVoteSocket({
      matchId,
      autoConnect,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
    });

  const setStats = useStatsStore((state) => state.setStats);

  /**
   * Update store when stats change from WebSocket
   */
  useEffect(() => {
    if (stats) {
      if (debug) {
        logger.debug('Updating stats store from WebSocket', { stats });
      }

      setStats({
        teamAVotes: stats.teamAVotes,
        teamBVotes: stats.teamBVotes,
        totalVotes: stats.totalVotes,
      });
    }
  }, [stats, setStats, debug]);

  /**
   * Log connection status changes
   */
  useEffect(() => {
    if (debug) {
      logger.debug('Vote updates connection status', {
        matchId,
        connected,
        connecting,
        connectionError,
      });
    }
  }, [connected, connecting, connectionError, matchId, debug]);

  return {
    connected,
    connecting,
    connectionError,
    connect,
    disconnect,
    retry,
  };
}

/**
 * useVoteUpdatesWithCallback
 *
 * Extended version that allows custom callbacks on vote updates.
 *
 * @example
 * ```tsx
 * useVoteUpdatesWithCallback({
 *   matchId,
 *   onVoteUpdate: (stats) => {
 *     console.log('New vote!', stats);
 *     playNotificationSound();
 *   },
 *   onConnectionChange: (connected) => {
 *     if (connected) {
 *       showToast('Connected to live updates');
 *     }
 *   }
 * });
 * ```
 */
export function useVoteUpdatesWithCallback({
  matchId,
  autoConnect = true,
  onVoteUpdate,
  onConnectionChange,
  debug = false,
}: UseVoteUpdatesOptions & {
  onVoteUpdate?: (stats: { teamAVotes: number; teamBVotes: number; totalVotes: number }) => void;
  onConnectionChange?: (connected: boolean) => void;
}): UseVoteUpdatesReturn {
  const result = useVoteUpdates({ matchId, autoConnect, debug });
  const { connected, stats } = useVoteSocket({ matchId, autoConnect: false });

  // Call onConnectionChange when connection status changes
  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(connected);
    }
  }, [connected, onConnectionChange]);

  // Call onVoteUpdate when stats change
  useEffect(() => {
    if (stats && onVoteUpdate) {
      onVoteUpdate({
        teamAVotes: stats.teamAVotes,
        teamBVotes: stats.teamBVotes,
        totalVotes: stats.totalVotes,
      });
    }
  }, [stats, onVoteUpdate]);

  return result;
}

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/lib/logger';
import type { VoteEvent, AggregateUpdateEvent, MatchStatsEvent } from '@/server/websocket';
import type { VoteAggregate, MatchStats } from '@/services/aggregation-service';

export interface UseVoteSocketOptions {
  matchId: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface UseVoteSocketReturn {
  connected: boolean;
  connecting: boolean;
  stats: MatchStats | null;
  aggregates: VoteAggregate[];
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  retry: () => void;
}

export function useVoteSocket({
  matchId,
  autoConnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 1000
}: UseVoteSocketOptions): UseVoteSocketReturn {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [aggregates, setAggregates] = useState<VoteAggregate[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Create and configure socket connection
   */
  const createSocket = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    logger.debug('Creating WebSocket connection', { wsUrl, matchId });

    const socket = io(`${wsUrl}/votes`, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true,
      reconnection: false // We handle reconnection manually
    });

    // Connection events
    socket.on('connect', () => {
      logger.info('WebSocket connected', { matchId, socketId: socket.id });
      setConnected(true);
      setConnecting(false);
      setConnectionError(null);
      reconnectCountRef.current = 0;

      // Join match room
      socket.emit('join-match', matchId);
    });

    socket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnected', { matchId, reason });
      setConnected(false);
      setConnecting(false);

      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect' && reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error', { error, matchId });
      setConnected(false);
      setConnecting(false);
      setConnectionError(error.message || 'Connection failed');

      // Attempt reconnection
      if (reconnectCountRef.current < reconnectAttempts) {
        scheduleReconnect();
      }
    });

    // Vote events
    socket.on('vote:new', (voteEvent: VoteEvent) => {
      logger.debug('Received new vote event', { voteEvent });
      // Vote events trigger stats updates, so we don't need to handle them directly
    });

    // Aggregate events
    socket.on('aggregate:updated', (updateEvent: AggregateUpdateEvent) => {
      logger.debug('Received aggregate update', { updateEvent });
      
      setAggregates(prev => {
        const updated = [...prev];
        const existingIndex = updated.findIndex(
          agg => agg.aggregateType === updateEvent.aggregateType && 
                 agg.locationKey === updateEvent.locationKey
        );

        const updatedAggregate: VoteAggregate = {
          aggregateType: updateEvent.aggregateType,
          locationKey: updateEvent.locationKey,
          teamACount: updateEvent.teamACount,
          teamBCount: updateEvent.teamBCount,
          voteCount: updateEvent.voteCount,
          lastUpdatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          updated[existingIndex] = updatedAggregate;
        } else {
          updated.push(updatedAggregate);
        }

        return updated;
      });
    });

    // Stats events
    socket.on('match:stats', (statsEvent: MatchStatsEvent) => {
      logger.debug('Received match stats', { stats: statsEvent.stats });
      setStats(statsEvent.stats);
    });

    // Initial aggregates
    socket.on('aggregates:initial', (data: { matchId: string; aggregates: VoteAggregate[] }) => {
      logger.debug('Received initial aggregates', { count: data.aggregates.length });
      setAggregates(data.aggregates);
    });

    // Error events
    socket.on('error', (error: { message: string }) => {
      logger.error('WebSocket error', { error, matchId });
      setConnectionError(error.message);
    });

    return socket;
  }, [matchId, reconnectAttempts]);

  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = reconnectDelay * Math.pow(2, reconnectCountRef.current); // Exponential backoff
    reconnectCountRef.current++;

    logger.info('Scheduling WebSocket reconnection', { 
      matchId, 
      attempt: reconnectCountRef.current, 
      delay 
    });

    reconnectTimeoutRef.current = setTimeout(() => {
      if (reconnectCountRef.current <= reconnectAttempts) {
        connect();
      }
    }, delay);
  }, [matchId, reconnectDelay, reconnectAttempts]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.debug('WebSocket already connected', { matchId });
      return;
    }

    if (connecting) {
      logger.debug('WebSocket connection already in progress', { matchId });
      return;
    }

    logger.info('Connecting to WebSocket', { matchId });
    setConnecting(true);
    setConnectionError(null);

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    // Create new socket
    socketRef.current = createSocket();
  }, [matchId, connecting, createSocket]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    logger.info('Disconnecting from WebSocket', { matchId });

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.emit('leave-match', matchId);
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset state
    setConnected(false);
    setConnecting(false);
    setConnectionError(null);
    reconnectCountRef.current = 0;
  }, [matchId]);

  /**
   * Retry connection
   */
  const retry = useCallback(() => {
    logger.info('Retrying WebSocket connection', { matchId });
    reconnectCountRef.current = 0;
    disconnect();
    setTimeout(() => connect(), 100);
  }, [matchId, connect, disconnect]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && matchId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [matchId, autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connected,
    connecting,
    stats,
    aggregates,
    connectionError,
    connect,
    disconnect,
    retry
  };
}
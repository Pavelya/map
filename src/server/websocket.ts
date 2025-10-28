import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { logger } from '@/lib/logger';
import { aggregationService } from '@/services/aggregation-service';
import type { MatchStats } from '@/services/aggregation-service';

export interface VoteEvent {
  matchId: string;
  teamChoice: 'team_a' | 'team_b';
  h3Index: string;
  h3Resolution: number;
  countryCode?: string;
  timestamp: string;
}

export interface AggregateUpdateEvent {
  matchId: string;
  aggregateType: 'h3' | 'country';
  locationKey: string;
  teamACount: number;
  teamBCount: number;
  voteCount: number;
}

export interface MatchStatsEvent {
  matchId: string;
  stats: MatchStats;
}

class WebSocketServer {
  private io: SocketIOServer | null = null;
  private server: any = null;
  private port: number;
  private connectionCounts = new Map<string, number>(); // IP -> connection count
  private readonly MAX_CONNECTIONS_PER_IP = 10;

  constructor() {
    this.port = parseInt(process.env['WS_PORT'] || '3001');
  }

  /**
   * Initialize and start the WebSocket server
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting WebSocket server', { port: this.port });

      // Create HTTP server
      this.server = createServer();

      // Initialize Socket.IO
      this.io = new SocketIOServer(this.server, {
        cors: {
          origin: process.env['NEXT_PUBLIC_APP_URL'] || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Create votes namespace
      const votesNamespace = this.io.of('/votes');

      // Handle connections
      votesNamespace.on('connection', (socket) => {
        this.handleConnection(socket);
      });

      // Start server
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      logger.info('WebSocket server started successfully', { port: this.port });
    } catch (error) {
      logger.error('Failed to start WebSocket server', { error, port: this.port });
      throw error;
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: any): void {
    const clientIP = socket.handshake.address;
    const clientId = socket.id;

    logger.info('New WebSocket connection', { clientId, clientIP });

    // Rate limit connections per IP
    const currentConnections = this.connectionCounts.get(clientIP) || 0;
    if (currentConnections >= this.MAX_CONNECTIONS_PER_IP) {
      logger.warn('Connection limit exceeded for IP', { clientIP, currentConnections });
      socket.emit('error', { message: 'Connection limit exceeded' });
      socket.disconnect();
      return;
    }

    // Update connection count
    this.connectionCounts.set(clientIP, currentConnections + 1);

    // Handle match room joining
    socket.on('join-match', async (matchId: string) => {
      try {
        if (!matchId || typeof matchId !== 'string') {
          socket.emit('error', { message: 'Invalid match ID' });
          return;
        }

        const roomName = `match:${matchId}`;
        await socket.join(roomName);

        logger.info('Client joined match room', { clientId, matchId, roomName });

        // Send current stats to the new client
        const stats = await aggregationService.getRealtimeStats(matchId);
        socket.emit('match:stats', { matchId, stats });

        // Send current aggregates
        const aggregates = await aggregationService.getMatchAggregates(matchId);
        socket.emit('aggregates:initial', { matchId, aggregates });

      } catch (error) {
        logger.error('Error joining match room', { error, clientId, matchId });
        socket.emit('error', { message: 'Failed to join match room' });
      }
    });

    // Handle leaving match room
    socket.on('leave-match', (matchId: string) => {
      try {
        const roomName = `match:${matchId}`;
        socket.leave(roomName);
        logger.info('Client left match room', { clientId, matchId, roomName });
      } catch (error) {
        logger.error('Error leaving match room', { error, clientId, matchId });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      logger.info('WebSocket client disconnected', { clientId, clientIP, reason });

      // Update connection count
      const currentConnections = this.connectionCounts.get(clientIP) || 0;
      if (currentConnections > 1) {
        this.connectionCounts.set(clientIP, currentConnections - 1);
      } else {
        this.connectionCounts.delete(clientIP);
      }
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error('WebSocket client error', { error, clientId, clientIP });
    });
  }

  /**
   * Broadcast new vote event
   */
  async broadcastVote(voteEvent: VoteEvent): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast vote');
      return;
    }

    try {
      const roomName = `match:${voteEvent.matchId}`;
      const votesNamespace = this.io.of('/votes');
      
      votesNamespace.to(roomName).emit('vote:new', voteEvent);
      
      logger.debug('Broadcasted vote event', { 
        matchId: voteEvent.matchId,
        roomName,
        teamChoice: voteEvent.teamChoice
      });
    } catch (error) {
      logger.error('Error broadcasting vote', { error, voteEvent });
    }
  }

  /**
   * Broadcast aggregate update
   */
  async broadcastAggregateUpdate(updateEvent: AggregateUpdateEvent): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast aggregate update');
      return;
    }

    try {
      const roomName = `match:${updateEvent.matchId}`;
      const votesNamespace = this.io.of('/votes');
      
      votesNamespace.to(roomName).emit('aggregate:updated', updateEvent);
      
      logger.debug('Broadcasted aggregate update', { 
        matchId: updateEvent.matchId,
        aggregateType: updateEvent.aggregateType,
        locationKey: updateEvent.locationKey
      });
    } catch (error) {
      logger.error('Error broadcasting aggregate update', { error, updateEvent });
    }
  }

  /**
   * Broadcast match statistics update
   */
  async broadcastMatchStats(statsEvent: MatchStatsEvent): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket server not initialized, cannot broadcast stats');
      return;
    }

    try {
      const roomName = `match:${statsEvent.matchId}`;
      const votesNamespace = this.io.of('/votes');
      
      votesNamespace.to(roomName).emit('match:stats', statsEvent);
      
      logger.debug('Broadcasted match stats', { 
        matchId: statsEvent.matchId,
        totalVotes: statsEvent.stats.totalVotes
      });
    } catch (error) {
      logger.error('Error broadcasting match stats', { error, statsEvent });
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    connectionsPerIP: Record<string, number>;
    namespaceConnections: number;
  } {
    const totalConnections = Array.from(this.connectionCounts.values())
      .reduce((sum, count) => sum + count, 0);

    const connectionsPerIP = Object.fromEntries(this.connectionCounts);

    const namespaceConnections = this.io?.of('/votes').sockets.size || 0;

    return {
      totalConnections,
      connectionsPerIP,
      namespaceConnections
    };
  }

  /**
   * Gracefully shutdown the server
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down WebSocket server');

      if (this.io) {
        // Disconnect all clients
        this.io.of('/votes').disconnectSockets();
        this.io.close();
        this.io = null;
      }

      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            resolve();
          });
        });
        this.server = null;
      }

      // Clear connection tracking
      this.connectionCounts.clear();

      logger.info('WebSocket server shutdown complete');
    } catch (error) {
      logger.error('Error during WebSocket server shutdown', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const webSocketServer = new WebSocketServer();

// Auto-start server if this module is run directly
if (require.main === module) {
  webSocketServer.start().catch((error) => {
    logger.error('Failed to start WebSocket server', { error });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await webSocketServer.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    await webSocketServer.shutdown();
    process.exit(0);
  });
}
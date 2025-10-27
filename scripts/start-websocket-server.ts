#!/usr/bin/env tsx

import { webSocketServer } from '../src/server/websocket';
import { logger } from '../src/lib/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function startServer() {
  try {
    logger.info('Starting WebSocket server for Task 5...');
    
    await webSocketServer.start();
    
    logger.info('WebSocket server started successfully');
    logger.info(`Server running on port ${process.env.WS_PORT || 3001}`);
    logger.info('Press Ctrl+C to stop the server');
    
  } catch (error) {
    logger.error('Failed to start WebSocket server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await webSocketServer.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await webSocketServer.shutdown();
  process.exit(0);
});

// Start the server
startServer();
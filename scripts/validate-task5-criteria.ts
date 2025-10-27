#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { logger } from '../src/lib/logger';
import { aggregationService } from '../src/services/aggregation-service';
import { webSocketServer } from '../src/server/websocket';
import { cache } from '../src/lib/cache';
import { 
  calculateH3Neighbors, 
  aggregateByResolution, 
  calculateDominance,
  formatAggregateForMap 
} from '../src/lib/aggregation-utils';
import { io as ioClient } from 'socket.io-client';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ValidationResult {
  test: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class Task5Validator {
  private results: ValidationResult[] = [];
  private testMatchId: string = '';

  async validate(): Promise<void> {
    logger.info('Starting Task 5 validation: Real-time Vote Aggregation System');

    try {
      // 1. Test PostgreSQL functions
      await this.testPostgreSQLFunctions();

      // 2. Test aggregation service
      await this.testAggregationService();

      // 3. Test WebSocket server
      await this.testWebSocketServer();

      // 4. Test caching layer
      await this.testCachingLayer();

      // 5. Test aggregation utilities
      await this.testAggregationUtils();

      // 6. Test bulk operations
      await this.testBulkOperations();

      // 7. Test real-time updates
      await this.testRealTimeUpdates();

      // Print results
      this.printResults();

    } catch (error) {
      logger.error('Validation failed with error', { error });
      this.addResult('Overall validation', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testPostgreSQLFunctions(): Promise<void> {
    logger.info('Testing PostgreSQL functions...');

    try {
      // Create test match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          team_a_name: 'Test Team A',
          team_a_color: '#FF0000',
          team_b_name: 'Test Team B',
          team_b_color: '#0000FF',
          title: 'Task 5 Validation Match',
          description: 'Test match for validation',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (matchError) throw matchError;
      this.testMatchId = match.id;
      this.addResult('Create test match', true, null, { matchId: this.testMatchId });

      // Test increment_h3_aggregate function
      const { error: h3Error } = await supabase.rpc('increment_h3_aggregate', {
        p_match_id: this.testMatchId,
        p_h3_index: '8a1fb46622dffff',
        p_h3_resolution: 10,
        p_team_choice: 'team_a'
      });

      this.addResult('increment_h3_aggregate function', !h3Error, h3Error?.message);

      // Test increment_country_aggregate function
      const { error: countryError } = await supabase.rpc('increment_country_aggregate', {
        p_match_id: this.testMatchId,
        p_country_code: 'US',
        p_team_choice: 'team_b'
      });

      this.addResult('increment_country_aggregate function', !countryError, countryError?.message);

      // Test get_match_aggregates function
      const { data: aggregates, error: aggError } = await supabase.rpc('get_match_aggregates', {
        p_match_id: this.testMatchId
      });

      this.addResult('get_match_aggregates function', !aggError && Array.isArray(aggregates), 
        aggError?.message, { aggregateCount: aggregates?.length });

      // Test get_realtime_stats function
      const { data: stats, error: statsError } = await supabase.rpc('get_realtime_stats', {
        p_match_id: this.testMatchId
      });

      this.addResult('get_realtime_stats function', !statsError && Array.isArray(stats), 
        statsError?.message, { stats: stats?.[0] });

    } catch (error) {
      this.addResult('PostgreSQL functions test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testAggregationService(): Promise<void> {
    logger.info('Testing aggregation service...');

    try {
      // Test updateH3Aggregate
      await aggregationService.updateH3Aggregate(
        this.testMatchId,
        '8a1fb46622dffff',
        10,
        'team_a'
      );
      this.addResult('AggregationService.updateH3Aggregate', true);

      // Test updateCountryAggregate
      await aggregationService.updateCountryAggregate(
        this.testMatchId,
        'CA',
        'team_b'
      );
      this.addResult('AggregationService.updateCountryAggregate', true);

      // Test getMatchAggregates
      const aggregates = await aggregationService.getMatchAggregates(this.testMatchId);
      this.addResult('AggregationService.getMatchAggregates', Array.isArray(aggregates), 
        null, { count: aggregates.length });

      // Test getRealtimeStats
      const stats = await aggregationService.getRealtimeStats(this.testMatchId);
      this.addResult('AggregationService.getRealtimeStats', typeof stats === 'object' && stats !== null,
        null, { stats });

    } catch (error) {
      this.addResult('Aggregation service test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testWebSocketServer(): Promise<void> {
    logger.info('Testing WebSocket server...');

    try {
      // Start WebSocket server
      await webSocketServer.start();
      this.addResult('WebSocket server start', true);

      // Test connection stats
      const stats = webSocketServer.getConnectionStats();
      this.addResult('WebSocket connection stats', typeof stats === 'object',
        null, { stats });

      // Test client connection
      await this.testWebSocketClient();

    } catch (error) {
      this.addResult('WebSocket server test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testWebSocketClient(): Promise<void> {
    return new Promise((resolve) => {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const client = ioClient(`${wsUrl}/votes`);

      let connected = false;
      let receivedStats = false;

      const timeout = setTimeout(() => {
        client.disconnect();
        this.addResult('WebSocket client connection', connected);
        this.addResult('WebSocket receive stats', receivedStats);
        resolve();
      }, 5000);

      client.on('connect', () => {
        connected = true;
        client.emit('join-match', this.testMatchId);
      });

      client.on('match:stats', () => {
        receivedStats = true;
      });

      client.on('error', (error) => {
        clearTimeout(timeout);
        client.disconnect();
        this.addResult('WebSocket client connection', false, error.message);
        resolve();
      });
    });
  }

  private async testCachingLayer(): Promise<void> {
    logger.info('Testing caching layer...');

    try {
      // Test cache stats
      const cacheStats = await cache.getCacheStats();
      this.addResult('Cache stats retrieval', typeof cacheStats === 'object',
        null, { cacheStats });

      // Test cache operations
      const testStats = {
        totalVotes: 100,
        teamAVotes: 60,
        teamBVotes: 40,
        uniqueCountries: 5,
        uniqueH3Cells: 20,
        lastVoteAt: new Date().toISOString()
      };

      await cache.setMatchStats(this.testMatchId, testStats);
      const cachedStats = await cache.getMatchStats(this.testMatchId);
      
      this.addResult('Cache set/get stats', 
        cachedStats !== null && cachedStats.totalVotes === testStats.totalVotes);

      // Test cache invalidation
      await cache.invalidateMatchStats(this.testMatchId);
      const invalidatedStats = await cache.getMatchStats(this.testMatchId);
      
      this.addResult('Cache invalidation', invalidatedStats === null);

    } catch (error) {
      this.addResult('Caching layer test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testAggregationUtils(): Promise<void> {
    logger.info('Testing aggregation utilities...');

    try {
      // Test calculateH3Neighbors
      const neighbors = calculateH3Neighbors('8a1fb46622dffff', 1);
      this.addResult('calculateH3Neighbors', Array.isArray(neighbors) && neighbors.length > 0,
        null, { neighborCount: neighbors.length });

      // Test calculateDominance
      const dominance = calculateDominance(60, 40);
      this.addResult('calculateDominance', 
        dominance.dominantTeam === 'team_a' && dominance.dominancePercentage === 60,
        null, { dominance });

      // Test aggregateByResolution
      const testVotes = [
        { h3Index: '8a1fb46622dffff', h3Resolution: 10, teamChoice: 'team_a' as const },
        { h3Index: '8a1fb46622dffff', h3Resolution: 10, teamChoice: 'team_b' as const }
      ];
      const aggregated = aggregateByResolution(testVotes, 10);
      this.addResult('aggregateByResolution', aggregated.size > 0,
        null, { aggregatedCells: aggregated.size });

      // Test formatAggregateForMap
      const testAggregate = {
        aggregateType: 'h3' as const,
        locationKey: '8a1fb46622dffff',
        resolution: 10,
        teamACount: 5,
        teamBCount: 3,
        voteCount: 8,
        lastUpdatedAt: new Date().toISOString()
      };
      const formatted = formatAggregateForMap(testAggregate);
      this.addResult('formatAggregateForMap', formatted !== null && formatted.totalVotes === 8,
        null, { formatted });

    } catch (error) {
      this.addResult('Aggregation utils test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testBulkOperations(): Promise<void> {
    logger.info('Testing bulk operations...');

    try {
      // Create bulk votes
      const bulkVotes = Array.from({ length: 100 }, (_, i) => ({
        matchId: this.testMatchId,
        h3Index: `8a1fb46622d${i.toString().padStart(4, '0')}`,
        h3Resolution: 10,
        countryCode: i % 2 === 0 ? 'US' : 'CA',
        teamChoice: (i % 2 === 0 ? 'team_a' : 'team_b') as 'team_a' | 'team_b'
      }));

      const startTime = Date.now();
      await aggregationService.bulkUpdateAggregates(bulkVotes);
      const duration = Date.now() - startTime;

      this.addResult('Bulk aggregate updates', true, null, { 
        voteCount: bulkVotes.length, 
        duration: `${duration}ms` 
      });

      // Verify aggregates were created
      const aggregates = await aggregationService.getMatchAggregates(this.testMatchId);
      this.addResult('Bulk updates verification', aggregates.length > 0, null, {
        aggregateCount: aggregates.length
      });

    } catch (error) {
      this.addResult('Bulk operations test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async testRealTimeUpdates(): Promise<void> {
    logger.info('Testing real-time updates...');

    try {
      // Submit rapid votes and verify aggregates
      const rapidVotes = Array.from({ length: 10 }, (_, i) => ({
        matchId: this.testMatchId,
        h3Index: '8a1fb46622dffff',
        h3Resolution: 10,
        countryCode: 'US',
        teamChoice: (i % 2 === 0 ? 'team_a' : 'team_b') as 'team_a' | 'team_b'
      }));

      // Submit votes rapidly
      const promises = rapidVotes.map(vote => 
        aggregationService.updateH3Aggregate(
          vote.matchId,
          vote.h3Index,
          vote.h3Resolution,
          vote.teamChoice
        )
      );

      await Promise.all(promises);

      // Verify final aggregate is correct
      const finalAggregates = await aggregationService.getMatchAggregates(this.testMatchId);
      const h3Aggregate = finalAggregates.find(agg => 
        agg.aggregateType === 'h3' && agg.locationKey === '8a1fb46622dffff'
      );

      const expectedTotal = h3Aggregate ? h3Aggregate.teamACount + h3Aggregate.teamBCount : 0;
      this.addResult('Rapid vote aggregation', expectedTotal >= 10, null, {
        finalAggregate: h3Aggregate,
        expectedMinimum: 10
      });

    } catch (error) {
      this.addResult('Real-time updates test', false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private addResult(test: string, passed: boolean, error?: string, details?: any): void {
    this.results.push({ test, passed, error, details });
    
    if (passed) {
      logger.info(`✅ ${test}`, details);
    } else {
      logger.error(`❌ ${test}`, { error, details });
    }
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    console.log('\n' + '='.repeat(80));
    console.log('TASK 5 VALIDATION RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(80));

    // Print failed tests
    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\nFAILED TESTS:');
      failed.forEach(result => {
        console.log(`❌ ${result.test}: ${result.error || 'Unknown error'}`);
      });
    }

    console.log('\nDETAILED RESULTS:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.test}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Cleanup
    this.cleanup();
  }

  private async cleanup(): Promise<void> {
    try {
      // Clean up test match
      if (this.testMatchId) {
        await supabase.from('matches').delete().eq('id', this.testMatchId);
        logger.info('Cleaned up test match', { matchId: this.testMatchId });
      }

      // Shutdown WebSocket server
      await webSocketServer.shutdown();
      logger.info('WebSocket server shutdown complete');

    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  }
}

// Run validation
const validator = new Task5Validator();
validator.validate().catch(console.error);
import { redis } from '@/lib/redis';
import { logger } from '@/lib/logger';
import type { VoteAggregate, MatchStats } from '@/services/aggregation-service';

class CacheService {
  private readonly AGGREGATE_TTL = 30; // 30 seconds
  private readonly STATS_TTL = 5; // 5 seconds

  /**
   * Get cached match aggregates
   */
  async getMatchAggregates(matchId: string): Promise<VoteAggregate[] | null> {
    try {
      const key = `aggregates:${matchId}`;
      const cached = await redis.get(key);

      if (cached && typeof cached === 'string') {
        logger.debug('Cache hit for match aggregates', { matchId });
        return JSON.parse(cached);
      }

      logger.debug('Cache miss for match aggregates', { matchId });
      return null;
    } catch (error) {
      logger.error('Error getting cached aggregates', { error, matchId });
      return null;
    }
  }

  /**
   * Set match aggregates in cache
   */
  async setMatchAggregates(matchId: string, aggregates: VoteAggregate[]): Promise<void> {
    try {
      const key = `aggregates:${matchId}`;
      await redis.setex(key, this.AGGREGATE_TTL, JSON.stringify(aggregates));
      logger.debug('Cached match aggregates', { matchId, count: aggregates.length });
    } catch (error) {
      logger.error('Error caching aggregates', { error, matchId });
    }
  }

  /**
   * Get cached match stats
   */
  async getMatchStats(matchId: string): Promise<MatchStats | null> {
    try {
      const key = `stats:${matchId}`;
      const cached = await redis.get(key);

      if (cached && typeof cached === 'string') {
        logger.debug('Cache hit for match stats', { matchId });
        return JSON.parse(cached);
      }

      logger.debug('Cache miss for match stats', { matchId });
      return null;
    } catch (error) {
      logger.error('Error getting cached stats', { error, matchId });
      return null;
    }
  }

  /**
   * Set match stats in cache
   */
  async setMatchStats(matchId: string, stats: MatchStats): Promise<void> {
    try {
      const key = `stats:${matchId}`;
      await redis.setex(key, this.STATS_TTL, JSON.stringify(stats));
      logger.debug('Cached match stats', { matchId, stats });
    } catch (error) {
      logger.error('Error caching stats', { error, matchId });
    }
  }

  /**
   * Invalidate match aggregates cache
   */
  async invalidateMatchAggregates(matchId: string): Promise<void> {
    try {
      const key = `aggregates:${matchId}`;
      await redis.del(key);
      logger.debug('Invalidated aggregates cache', { matchId });
    } catch (error) {
      logger.error('Error invalidating aggregates cache', { error, matchId });
    }
  }

  /**
   * Invalidate match stats cache
   */
  async invalidateMatchStats(matchId: string): Promise<void> {
    try {
      const key = `stats:${matchId}`;
      await redis.del(key);
      logger.debug('Invalidated stats cache', { matchId });
    } catch (error) {
      logger.error('Error invalidating stats cache', { error, matchId });
    }
  }

  /**
   * Invalidate all cache for a match
   */
  async invalidateMatch(matchId: string): Promise<void> {
    await Promise.all([
      this.invalidateMatchAggregates(matchId),
      this.invalidateMatchStats(matchId)
    ]);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    aggregateKeys: number;
    statsKeys: number;
    totalKeys: number;
  }> {
    try {
      const aggregateKeys = await redis.keys('aggregates:*');
      const statsKeys = await redis.keys('stats:*');
      
      return {
        aggregateKeys: aggregateKeys.length,
        statsKeys: statsKeys.length,
        totalKeys: aggregateKeys.length + statsKeys.length
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return {
        aggregateKeys: 0,
        statsKeys: 0,
        totalKeys: 0
      };
    }
  }
}

export const cache = new CacheService();
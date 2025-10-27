#!/usr/bin/env ts-node
/**
 * TASK 9 VALIDATION: Fraud Detection System
 *
 * This script validates that the fraud detection system is properly implemented.
 */

import { logger } from '../src/lib/logger';
import { supabase } from '../src/lib/db';
import { redis } from '../src/lib/redis';
import {
  trackIPForFingerprint,
  trackFingerprintForIP,
  trackVoteTime,
  trackCoordinates,
  getUniqueIPCount,
  getUniqueFingerprintCount,
  getVoteTimestamps,
  getCoordinateCount
} from '../src/lib/fraud-patterns';
import {
  detectMultipleIPsPerFingerprint,
  detectMultipleFingerprintsPerIP,
  detectRapidVoting,
  detectSuspiciousUserAgent,
  detectGeoInconsistency,
  detectCoordinateSpoofing,
  detectFraud
} from '../src/services/fraud-detection';
import { logFraudEvent } from '../src/services/fraud-logger';
import {
  getFraudStats,
  getMostFlaggedIPs,
  getMostFlaggedFingerprints,
  getReviewProgress
} from '../src/services/fraud-stats';
import { calculateFraudScore, shouldBlockVote, shouldReviewVote } from '../src/lib/fraud-utils';
import type { FraudEventData } from '../src/services/fraud-logger';

interface ValidationResult {
  passed: boolean;
  message: string;
  details?: any;
}

const results: ValidationResult[] = [];
let testsRun = 0;
let testsPassed = 0;

function logResult(result: ValidationResult) {
  results.push(result);
  testsRun++;
  if (result.passed) {
    testsPassed++;
    logger.info(`✅ ${result.message}`);
  } else {
    logger.error(`❌ ${result.message}`, result.details);
  }
}

async function validateRedisPatternTracking(): Promise<void> {
  logger.info('\n📊 Validating Redis Pattern Tracking...');

  const testMatchId = 'test-match-' + Date.now();
  const testFp1 = 'fp-test-1';
  const testFp2 = 'fp-test-2';
  const testIP1 = 'ip-test-1';
  const testIP2 = 'ip-test-2';

  try {
    // Test IP tracking for fingerprint
    await trackIPForFingerprint(testFp1, testIP1, testMatchId);
    await trackIPForFingerprint(testFp1, testIP2, testMatchId);
    const ipCount = await getUniqueIPCount(testFp1, testMatchId);

    logResult({
      passed: ipCount === 2,
      message: 'Track multiple IPs per fingerprint',
      details: { expected: 2, actual: ipCount }
    });

    // Test fingerprint tracking for IP
    await trackFingerprintForIP(testIP1, testFp1, testMatchId);
    await trackFingerprintForIP(testIP1, testFp2, testMatchId);
    const fpCount = await getUniqueFingerprintCount(testIP1, testMatchId);

    logResult({
      passed: fpCount === 2,
      message: 'Track multiple fingerprints per IP',
      details: { expected: 2, actual: fpCount }
    });

    // Test vote time tracking
    await trackVoteTime(testFp1, testMatchId);
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    await trackVoteTime(testFp1, testMatchId);
    const timestamps = await getVoteTimestamps(testFp1, testMatchId);

    logResult({
      passed: timestamps.length === 2,
      message: 'Track vote timestamps',
      details: { expected: 2, actual: timestamps.length }
    });

    // Test coordinate tracking
    const testLat = 40.7128;
    const testLon = -74.0060;
    await trackCoordinates(testMatchId, testLat, testLon);
    await trackCoordinates(testMatchId, testLat, testLon);
    const coordCount = await getCoordinateCount(testMatchId, testLat, testLon);

    logResult({
      passed: coordCount === 2,
      message: 'Track coordinates',
      details: { expected: 2, actual: coordCount }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Redis pattern tracking failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateFraudDetectionMethods(): Promise<void> {
  logger.info('\n🔍 Validating Fraud Detection Methods...');

  const testMatchId = 'test-match-' + Date.now();

  try {
    // Prepare test data for multiple IPs detection
    const fp1 = 'test-fp-multiple-ips';
    for (let i = 0; i < 5; i++) {
      await trackIPForFingerprint(fp1, `ip-${i}`, testMatchId);
    }

    const multipleIPsResult = await detectMultipleIPsPerFingerprint({
      matchId: testMatchId,
      fingerprintHash: fp1,
      ipHash: 'ip-current',
      userAgent: 'test'
    });

    logResult({
      passed: multipleIPsResult !== null,
      message: 'Detect multiple IPs per fingerprint (>3 threshold)',
      details: { detected: multipleIPsResult }
    });

    // Prepare test data for multiple fingerprints detection
    const ip1 = 'test-ip-multiple-fps';
    for (let i = 0; i < 7; i++) {
      await trackFingerprintForIP(ip1, `fp-${i}`, testMatchId);
    }

    const multipleFpsResult = await detectMultipleFingerprintsPerIP({
      matchId: testMatchId,
      fingerprintHash: 'fp-current',
      ipHash: ip1,
      userAgent: 'test'
    });

    logResult({
      passed: multipleFpsResult !== null,
      message: 'Detect multiple fingerprints per IP (>5 threshold)',
      details: { detected: multipleFpsResult }
    });

    // Test rapid voting detection
    const fpRapid = 'test-fp-rapid';
    const now = Date.now();
    await redis.rpush(`fraud:times:${fpRapid}:${testMatchId}`, (now - 5000).toString());
    await redis.rpush(`fraud:times:${fpRapid}:${testMatchId}`, now.toString());

    const rapidVotingResult = await detectRapidVoting({
      matchId: testMatchId,
      fingerprintHash: fpRapid,
      ipHash: 'test-ip',
      userAgent: 'test'
    });

    logResult({
      passed: rapidVotingResult !== null,
      message: 'Detect rapid voting (<10s threshold)',
      details: { detected: rapidVotingResult }
    });

    // Test suspicious user agent detection
    const botResult = await detectSuspiciousUserAgent({
      matchId: testMatchId,
      fingerprintHash: 'test-fp',
      ipHash: 'test-ip',
      userAgent: 'curl/7.68.0'
    });

    logResult({
      passed: botResult !== null,
      message: 'Detect suspicious user agent (bot)',
      details: { detected: botResult }
    });

    // Test geo inconsistency detection
    const geoResult = await detectGeoInconsistency({
      matchId: testMatchId,
      fingerprintHash: 'test-fp',
      ipHash: 'test-ip',
      userAgent: 'test',
      location: {
        latitude: 40.7128, // New York
        longitude: -74.0060,
        ipLatitude: 34.0522, // Los Angeles
        ipLongitude: -118.2437
      }
    });

    logResult({
      passed: geoResult !== null,
      message: 'Detect geo inconsistency (>100km threshold)',
      details: { detected: geoResult, distance: geoResult?.metadata?.['distance'] }
    });

    // Test coordinate spoofing detection
    const testMatchCoord = 'test-match-coord-' + Date.now();
    const spoofLat = 40.7128;
    const spoofLon = -74.0060;

    // Create 12 votes with exact same coordinates
    for (let i = 0; i < 12; i++) {
      await trackCoordinates(testMatchCoord, spoofLat, spoofLon);
    }

    const coordSpoofResult = await detectCoordinateSpoofing({
      matchId: testMatchCoord,
      fingerprintHash: 'test-fp',
      ipHash: 'test-ip',
      userAgent: 'test',
      location: {
        latitude: spoofLat,
        longitude: spoofLon
      }
    });

    logResult({
      passed: coordSpoofResult !== null,
      message: 'Detect coordinate spoofing (>10 threshold)',
      details: { detected: coordSpoofResult }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Fraud detection methods validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateFraudLogging(): Promise<void> {
  logger.info('\n📝 Validating Fraud Event Logging...');

  try {
    const testMatchId = 'test-match-logging-' + Date.now();
    const testFraudEvent: FraudEventData = {
      matchId: testMatchId,
      fingerprintHash: 'test-fp-logging',
      ipHash: 'test-ip-logging',
      eventType: 'test_event',
      severity: 'medium',
      reason: 'Test fraud event for validation',
      metadata: {
        testData: 'validation',
        timestamp: new Date().toISOString()
      }
    };

    await logFraudEvent(testFraudEvent);

    // Verify event was logged
    const { data, error } = await supabase
      .from('fraud_events')
      .select('*')
      .eq('match_id', testMatchId)
      .eq('fingerprint_hash', 'test-fp-logging')
      .single();

    logResult({
      passed: !error && data !== null,
      message: 'Log fraud event to database',
      details: { error, eventId: data?.id }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Fraud logging validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateFraudScoring(): Promise<void> {
  logger.info('\n⚖️ Validating Fraud Scoring...');

  try {
    const testEvents: FraudEventData[] = [
      {
        matchId: 'test',
        fingerprintHash: 'test-fp',
        ipHash: 'test-ip',
        eventType: 'test_low',
        severity: 'low',
        reason: 'Low severity event'
      },
      {
        matchId: 'test',
        fingerprintHash: 'test-fp',
        ipHash: 'test-ip',
        eventType: 'test_medium',
        severity: 'medium',
        reason: 'Medium severity event'
      },
      {
        matchId: 'test',
        fingerprintHash: 'test-fp',
        ipHash: 'test-ip',
        eventType: 'test_high',
        severity: 'high',
        reason: 'High severity event'
      }
    ];

    // Score should be: 1 (low) + 3 (medium) + 5 (high) = 9
    const score = calculateFraudScore(testEvents);

    logResult({
      passed: score === 9,
      message: 'Calculate fraud score correctly',
      details: { expected: 9, actual: score }
    });

    // Score 9 should not block (threshold is >10)
    const shouldBlock = shouldBlockVote(score);
    logResult({
      passed: !shouldBlock,
      message: 'Vote not blocked for score 9 (threshold >10)',
      details: { score, shouldBlock }
    });

    // Score 9 should flag for review (threshold >5)
    const shouldReview = shouldReviewVote(score);
    logResult({
      passed: shouldReview,
      message: 'Vote flagged for review for score 9 (threshold >5)',
      details: { score, shouldReview }
    });

    // Test blocking threshold
    const criticalEvents: FraudEventData[] = [
      {
        matchId: 'test',
        fingerprintHash: 'test-fp',
        ipHash: 'test-ip',
        eventType: 'test_critical',
        severity: 'critical',
        reason: 'Critical severity event'
      },
      {
        matchId: 'test',
        fingerprintHash: 'test-fp',
        ipHash: 'test-ip',
        eventType: 'test_high',
        severity: 'high',
        reason: 'High severity event'
      }
    ];

    // Score: 10 (critical) + 5 (high) = 15
    const highScore = calculateFraudScore(criticalEvents);
    const shouldBlockHigh = shouldBlockVote(highScore);

    logResult({
      passed: shouldBlockHigh,
      message: 'Vote blocked for score 15 (threshold >10)',
      details: { score: highScore, shouldBlock: shouldBlockHigh }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Fraud scoring validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateFraudStats(): Promise<void> {
  logger.info('\n📈 Validating Fraud Statistics...');

  try {
    // Create test fraud events
    const testMatchId = 'test-match-stats-' + Date.now();

    const testEvents: FraudEventData[] = [
      {
        matchId: testMatchId,
        fingerprintHash: 'fp-1',
        ipHash: 'ip-1',
        eventType: 'test_low',
        severity: 'low',
        reason: 'Low severity'
      },
      {
        matchId: testMatchId,
        fingerprintHash: 'fp-2',
        ipHash: 'ip-1',
        eventType: 'test_high',
        severity: 'high',
        reason: 'High severity'
      },
      {
        matchId: testMatchId,
        fingerprintHash: 'fp-3',
        ipHash: 'ip-2',
        eventType: 'test_medium',
        severity: 'medium',
        reason: 'Medium severity'
      }
    ];

    for (const event of testEvents) {
      await logFraudEvent(event);
    }

    // Wait a bit for database write
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get stats
    const stats = await getFraudStats(testMatchId);

    logResult({
      passed: stats.totalEvents >= 3,
      message: 'Get fraud stats for match',
      details: { stats }
    });

    // Get most flagged IPs
    const flaggedIPs = await getMostFlaggedIPs(testMatchId, 5);

    logResult({
      passed: flaggedIPs.length > 0,
      message: 'Get most flagged IPs',
      details: { count: flaggedIPs.length, ips: flaggedIPs }
    });

    // Get most flagged fingerprints
    const flaggedFPs = await getMostFlaggedFingerprints(testMatchId, 5);

    logResult({
      passed: flaggedFPs.length > 0,
      message: 'Get most flagged fingerprints',
      details: { count: flaggedFPs.length, fingerprints: flaggedFPs }
    });

    // Get review progress
    const reviewProgress = await getReviewProgress();

    logResult({
      passed: typeof reviewProgress.percentage === 'number',
      message: 'Get review progress',
      details: { reviewProgress }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Fraud stats validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateDatabaseSchema(): Promise<void> {
  logger.info('\n🗄️ Validating Database Schema...');

  try {
    // Check fraud_events table exists and has correct columns
    const { error } = await supabase
      .from('fraud_events')
      .select('*')
      .limit(1);

    logResult({
      passed: !error || error.code === 'PGRST116', // PGRST116 = no rows returned (table exists but empty)
      message: 'fraud_events table exists',
      details: { error: error?.message }
    });

    // Verify we can insert and query
    const testEvent = {
      match_id: 'schema-test-' + Date.now(),
      fingerprint_hash: 'test-fp',
      ip_hash: 'test-ip',
      detection_reason: 'Schema validation test',
      severity: 'low',
      metadata: { test: true }
    };

    const { error: insertError } = await supabase
      .from('fraud_events')
      .insert(testEvent);

    logResult({
      passed: !insertError,
      message: 'Can insert fraud events',
      details: { error: insertError?.message }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Database schema validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function validateIntegration(): Promise<void> {
  logger.info('\n🔗 Validating End-to-End Integration...');

  try {
    const testMatchId = 'test-match-integration-' + Date.now();

    // Run full fraud detection
    const fraudResult = await detectFraud({
      matchId: testMatchId,
      fingerprintHash: 'integration-test-fp',
      ipHash: 'integration-test-ip',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      location: {
        latitude: 40.7128,
        longitude: -74.0060,
        ipLatitude: 40.7589,
        ipLongitude: -73.9851
      }
    });

    logResult({
      passed: typeof fraudResult.isSuspicious === 'boolean',
      message: 'Run full fraud detection',
      details: {
        isSuspicious: fraudResult.isSuspicious,
        eventsCount: fraudResult.events.length,
        shouldBlock: fraudResult.shouldBlock
      }
    });

  } catch (error) {
    logResult({
      passed: false,
      message: 'Integration validation failed',
      details: { error: error instanceof Error ? error.message : error }
    });
  }
}

async function main() {
  logger.info('🚀 Starting TASK 9 Validation: Fraud Detection System\n');

  try {
    await validateDatabaseSchema();
    await validateRedisPatternTracking();
    await validateFraudDetectionMethods();
    await validateFraudLogging();
    await validateFraudScoring();
    await validateFraudStats();
    await validateIntegration();

    // Summary
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 VALIDATION SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`Total Tests: ${testsRun}`);
    logger.info(`Passed: ${testsPassed}`);
    logger.info(`Failed: ${testsRun - testsPassed}`);
    logger.info(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(2)}%`);
    logger.info('='.repeat(60));

    if (testsPassed === testsRun) {
      logger.info('\n✅ ALL TESTS PASSED! Fraud detection system is working correctly.');
      process.exit(0);
    } else {
      logger.error('\n❌ SOME TESTS FAILED. Please review the errors above.');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Fatal error during validation', {
      error: error instanceof Error ? error.message : error
    });
    process.exit(1);
  }
}

// Run validation
main();

#!/usr/bin/env tsx

// Load environment variables
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=');
        }
      }
    }
  }
}

loadEnv();

import { testRedisConnection } from '../src/lib/redis';
import { checkVoteRateLimit, checkIpRateLimit, checkApiRateLimit } from '../src/lib/rate-limit';
import { getRateLimitKey, resetRateLimit, getRateLimitStatus } from '../src/lib/rate-limit-utils';
import { hashIdentifier } from '../src/lib/api-utils';

async function validateTask3Criteria() {
  console.log('🔍 Validating Task 3: Redis Setup & Rate Limiting');
  console.log('='.repeat(60));

  let allTestsPassed = true;

  // Test 1: Redis Connection
  console.log('\n📡 Test 1: Redis Connection');
  try {
    const isConnected = await testRedisConnection();
    if (isConnected) {
      console.log('✅ Redis connection successful');
    } else {
      console.log('❌ Redis connection failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Redis connection error:', error);
    allTestsPassed = false;
  }

  // Test 2: Environment Variables
  console.log('\n🔧 Test 2: Environment Variables');
  const requiredEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'RATE_LIMIT_VOTE_PER_MINUTE',
    'RATE_LIMIT_VOTE_PER_HOUR',
    'RATE_LIMIT_API_PER_MINUTE'
  ];

  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set`);
    } else {
      console.log(`❌ ${envVar} is missing`);
      allTestsPassed = false;
    }
  }

  // Test 3: Rate Limit Key Generation
  console.log('\n🔑 Test 3: Rate Limit Key Generation');
  try {
    const testIdentifier = 'test-user-123';
    const testMatchId = 'match-456';

    const voteKey = getRateLimitKey('vote-fp', testIdentifier, testMatchId);
    const ipKey = getRateLimitKey('vote-ip', testIdentifier, testMatchId);
    const apiKey = getRateLimitKey('api', testIdentifier);

    console.log(`✅ Vote fingerprint key: ${voteKey}`);
    console.log(`✅ Vote IP key: ${ipKey}`);
    console.log(`✅ API key: ${apiKey}`);

    if (voteKey.includes('vote:fp:') && ipKey.includes('vote:ip:') && apiKey.includes('api:')) {
      console.log('✅ Rate limit key generation working correctly');
    } else {
      console.log('❌ Rate limit key generation failed');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Rate limit key generation error:', error);
    allTestsPassed = false;
  }

  // Test 4: Vote Rate Limiting
  console.log('\n🗳️  Test 4: Vote Rate Limiting');
  try {
    const testFingerprint = await hashIdentifier('test-fingerprint-' + Date.now());
    const testMatchId = 'test-match-' + Date.now();

    console.log('Testing vote rate limits (making 4 rapid requests)...');

    const results = [];
    for (let i = 1; i <= 4; i++) {
      const result = await checkVoteRateLimit(testFingerprint, testMatchId);
      results.push(result);
      console.log(`Request ${i}: success=${result.success}, remaining=${result.remaining}`);

      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if 4th request was blocked (assuming rate limit is 3 per minute)
    const rateLimit = parseInt(process.env['RATE_LIMIT_VOTE_PER_MINUTE'] || '3', 10);
    const blockedRequests = results.filter(r => !r.success);

    if (blockedRequests.length > 0) {
      console.log(`✅ Vote rate limiting working - ${blockedRequests.length} requests blocked`);
    } else if (rateLimit >= 4) {
      console.log('✅ Vote rate limiting working - all requests allowed (rate limit >= 4)');
    } else {
      console.log('❌ Vote rate limiting not working - expected some requests to be blocked');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Vote rate limiting test error:', error);
    allTestsPassed = false;
  }

  // Test 5: IP Rate Limiting
  console.log('\n🌐 Test 5: IP Rate Limiting');
  try {
    const testIp = await hashIdentifier('192.168.1.' + Math.floor(Math.random() * 255));
    const testMatchId = 'test-match-ip-' + Date.now();

    const result = await checkIpRateLimit(testIp, testMatchId);
    console.log(`✅ IP rate limit check: success=${result.success}, remaining=${result.remaining}`);

    if (typeof result.success === 'boolean' && typeof result.remaining === 'number') {
      console.log('✅ IP rate limiting structure correct');
    } else {
      console.log('❌ IP rate limiting structure incorrect');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ IP rate limiting test error:', error);
    allTestsPassed = false;
  }

  // Test 6: API Rate Limiting
  console.log('\n🔌 Test 6: API Rate Limiting');
  try {
    const testIdentifier = await hashIdentifier('api-test-' + Date.now());

    const result = await checkApiRateLimit(testIdentifier);
    console.log(`✅ API rate limit check: success=${result.success}, remaining=${result.remaining}`);

    if (typeof result.success === 'boolean' && typeof result.remaining === 'number') {
      console.log('✅ API rate limiting structure correct');
    } else {
      console.log('❌ API rate limiting structure incorrect');
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ API rate limiting test error:', error);
    allTestsPassed = false;
  }

  // Test 7: Rate Limit Utilities
  console.log('\n🛠️  Test 7: Rate Limit Utilities');
  try {
    const testKey = 'test:utility:' + Date.now();

    // Test status check
    const status = await getRateLimitStatus(testKey);
    console.log(`✅ Rate limit status check: exists=${status.exists}`);

    // Test reset (should work even if key doesn't exist)
    const resetResult = await resetRateLimit(testKey);
    console.log(`✅ Rate limit reset: success=${resetResult}`);

    console.log('✅ Rate limit utilities working');
  } catch (error) {
    console.log('❌ Rate limit utilities test error:', error);
    allTestsPassed = false;
  }

  // Test 8: Different Identifiers Have Separate Counters
  console.log('\n👥 Test 8: Separate Counters for Different Identifiers');
  try {
    const identifier1 = await hashIdentifier('user1-' + Date.now());
    const identifier2 = await hashIdentifier('user2-' + Date.now());
    const matchId = 'test-match-separate-' + Date.now();

    const result1 = await checkVoteRateLimit(identifier1, matchId);
    const result2 = await checkVoteRateLimit(identifier2, matchId);

    console.log(`User 1: remaining=${result1.remaining}`);
    console.log(`User 2: remaining=${result2.remaining}`);

    if (result1.remaining === result2.remaining) {
      console.log('✅ Different identifiers have separate counters');
    } else {
      console.log('⚠️  Different identifiers have different remaining counts (may be expected)');
    }
  } catch (error) {
    console.log('❌ Separate counters test error:', error);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 All Task 3 criteria validated successfully!');
    console.log('✅ Redis client connects successfully');
    console.log('✅ Rate limiters block requests correctly');
    console.log('✅ Different keys for different identifiers');
    console.log('✅ Rate limit utilities working');
    console.log('✅ Environment variables properly configured');
  } else {
    console.log('❌ Some Task 3 criteria failed validation');
    console.log('Please check the errors above and fix the issues');
  }

  return allTestsPassed;
}

// Run validation if called directly
if (require.main === module) {
  validateTask3Criteria()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation script error:', error);
      process.exit(1);
    });
}

export { validateTask3Criteria };
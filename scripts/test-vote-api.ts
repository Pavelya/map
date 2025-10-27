#!/usr/bin/env tsx

import { logger } from '../src/lib/logger';

/**
 * Test the vote API endpoint with sample data
 */
async function testVoteAPI(): Promise<void> {
  logger.info('🧪 Testing Vote API Endpoint...');

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/vote`;

  // Sample vote data
  const sampleVoteData = {
    matchId: '123e4567-e89b-12d3-a456-426614174000',
    teamChoice: 'team_a',
    fingerprint: 'test-fingerprint-' + Date.now(),
    location: {
      h3Index: '8a2a1072b59ffff',
      h3Resolution: 10,
      countryCode: 'US',
      cityName: 'New York',
      source: 'ip',
      consentPreciseGeo: true
    },
    captchaToken: 'test-token',
    userAgent: 'Mozilla/5.0 (Test) AppleWebKit/537.36'
  };

  try {
    logger.info('📤 Sending POST request to /api/vote...');
    logger.info(`URL: ${apiUrl}`);
    logger.info('Sample data:', sampleVoteData);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': sampleVoteData.userAgent,
        'X-Forwarded-For': '192.168.1.100'
      },
      body: JSON.stringify(sampleVoteData)
    });

    logger.info(`📥 Response status: ${response.status} ${response.statusText}`);
    
    // Log response headers
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    logger.info('Response headers:', headers);

    const responseData = await response.json();
    logger.info('Response body:', responseData);

    // Test different scenarios
    if (response.status === 201) {
      logger.info('✅ Vote submission successful!');
    } else if (response.status === 400) {
      logger.info('⚠️  Vote submission rejected (validation/business logic)');
    } else if (response.status === 429) {
      logger.info('⚠️  Rate limited (expected behavior)');
    } else if (response.status === 500) {
      logger.warn('❌ Server error (check database connection)');
    } else {
      logger.warn(`❓ Unexpected status: ${response.status}`);
    }

    // Test invalid data
    logger.info('\n🧪 Testing invalid data...');
    const invalidResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        matchId: 'invalid-uuid',
        teamChoice: 'invalid-team'
      })
    });

    logger.info(`📥 Invalid data response: ${invalidResponse.status}`);
    const invalidData = await invalidResponse.json();
    logger.info('Invalid data response body:', invalidData);

    if (invalidResponse.status === 400) {
      logger.info('✅ Validation correctly rejected invalid data');
    }

    // Test unsupported method
    logger.info('\n🧪 Testing unsupported method (GET)...');
    const getResponse = await fetch(apiUrl, {
      method: 'GET'
    });

    logger.info(`📥 GET response: ${getResponse.status}`);
    const getData = await getResponse.json();
    logger.info('GET response body:', getData);

    if (getResponse.status === 405) {
      logger.info('✅ Correctly returned 405 Method Not Allowed for GET');
    }

    logger.info('\n🎉 API endpoint testing completed!');

  } catch (error) {
    if (error instanceof Error && error.message.includes('fetch')) {
      logger.error('❌ Failed to connect to API endpoint');
      logger.error('Make sure the development server is running: npm run dev');
    } else {
      logger.error('❌ Test failed:', error);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testVoteAPI();
}

export { testVoteAPI };
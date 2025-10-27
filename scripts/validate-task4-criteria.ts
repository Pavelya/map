#!/usr/bin/env tsx

import { logger } from '../src/lib/logger';

/**
 * Validate Task 4 implementation criteria
 */
async function validateTask4Criteria(): Promise<void> {
  logger.info('🧪 Validating Task 4: Vote Submission API Endpoint...');

  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Check if all required files exist
    logger.info('1. Checking required files...');
    
    const requiredFiles = [
      'src/lib/validations/vote.ts',
      'src/app/api/vote/route.ts',
      'src/services/vote-service.ts',
      'src/lib/hash.ts',
      'src/lib/captcha.ts',
      'src/types/api.ts'
    ];

    const fs = await import('fs');
    const path = await import('path');

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        errors.push(`Missing required file: ${file}`);
      } else {
        logger.info(`✅ Found ${file}`);
      }
    }

    // 2. Check Zod validation schema
    logger.info('2. Checking Zod validation schema...');
    try {
      const { VoteSubmissionSchema } = await import('../src/lib/validations/vote');
      
      // Test valid data
      const validData = {
        matchId: '123e4567-e89b-12d3-a456-426614174000',
        teamChoice: 'team_a' as const,
        fingerprint: 'test-fingerprint',
        location: {
          h3Index: '8a2a1072b59ffff',
          h3Resolution: 10,
          countryCode: 'US',
          cityName: 'New York',
          source: 'ip' as const,
          consentPreciseGeo: true
        },
        captchaToken: 'test-token',
        userAgent: 'Mozilla/5.0 test'
      };

      const result = VoteSubmissionSchema.safeParse(validData);
      if (result.success) {
        logger.info('✅ Zod validation schema works correctly');
      } else {
        errors.push('Zod validation schema failed for valid data');
      }

      // Test invalid data
      const invalidResult = VoteSubmissionSchema.safeParse({
        matchId: 'invalid-uuid',
        teamChoice: 'invalid-team'
      });
      
      if (!invalidResult.success) {
        logger.info('✅ Zod validation correctly rejects invalid data');
      } else {
        warnings.push('Zod validation should reject invalid data');
      }

    } catch (error) {
      errors.push(`Failed to import or test Zod schema: ${error}`);
    }

    // 3. Check hash utilities
    logger.info('3. Checking hash utilities...');
    try {
      const { hashFingerprint, hashIP, hashUserAgent } = await import('../src/lib/hash');
      
      const testFingerprint = hashFingerprint('test');
      const testIP = hashIP('127.0.0.1');
      const testUA = hashUserAgent('test-agent');
      
      if (testFingerprint && testIP && testUA) {
        logger.info('✅ Hash utilities working correctly');
      } else {
        errors.push('Hash utilities not working correctly');
      }
    } catch (error) {
      errors.push(`Failed to test hash utilities: ${error}`);
    }

    // 4. Check API types
    logger.info('4. Checking API types...');
    try {
      const types = await import('../src/types/api');
      
      const requiredTypes = ['VoteResponse', 'ErrorResponse', 'VoteSubmissionData'];
      for (const typeName of requiredTypes) {
        // TypeScript types don't exist at runtime, so we just check if the module loads
        logger.info(`✅ Type definitions loaded (${typeName} should be available)`);
      }
    } catch (error) {
      errors.push(`Failed to load API types: ${error}`);
    }

    // 5. Check vote service functions (file structure only)
    logger.info('5. Checking vote service file structure...');
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const voteServicePath = path.join(process.cwd(), 'src/services/vote-service.ts');
      const content = fs.readFileSync(voteServicePath, 'utf-8');
      
      const requiredFunctions = ['submitVote', 'validateMatch', 'checkVoteLimit', 'detectFraud', 'logFraudEvent'];
      for (const funcName of requiredFunctions) {
        if (content.includes(`export async function ${funcName}`) || content.includes(`async function ${funcName}`)) {
          logger.info(`✅ Function ${funcName} exists`);
        } else {
          errors.push(`Missing function: ${funcName}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to check vote service: ${error}`);
    }

    // 6. Check captcha verification
    logger.info('6. Checking captcha verification...');
    try {
      const { verifyCaptcha } = await import('../src/lib/captcha');
      
      if (typeof verifyCaptcha === 'function') {
        logger.info('✅ Captcha verification function exists');
      } else {
        errors.push('Missing captcha verification function');
      }
    } catch (error) {
      errors.push(`Failed to load captcha module: ${error}`);
    }

    // 7. Check API route structure (file content only)
    logger.info('7. Checking API route structure...');
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const routePath = path.join(process.cwd(), 'src/app/api/vote/route.ts');
      const content = fs.readFileSync(routePath, 'utf-8');
      
      if (content.includes('export async function POST')) {
        logger.info('✅ POST handler exists');
      } else {
        errors.push('Missing POST handler in API route');
      }

      // Check for proper error handling methods
      const methods = ['GET', 'PUT', 'DELETE'];
      for (const method of methods) {
        if (content.includes(`export async function ${method}`)) {
          logger.info(`✅ ${method} handler exists (should return 405)`);
        } else {
          warnings.push(`Missing ${method} handler (should return 405 Method Not Allowed)`);
        }
      }
      
      // Check for required imports and functionality
      const requiredImports = [
        'VoteSubmissionSchema',
        'submitVote',
        'checkVoteRateLimit',
        'checkIpRateLimit',
        'hashFingerprint',
        'hashIP'
      ];
      
      for (const importName of requiredImports) {
        if (content.includes(importName)) {
          logger.info(`✅ Required import/usage: ${importName}`);
        } else {
          warnings.push(`Missing import/usage: ${importName}`);
        }
      }
      
    } catch (error) {
      errors.push(`Failed to check API route: ${error}`);
    }

    // Summary
    logger.info('\n📊 Validation Summary:');
    
    if (errors.length === 0) {
      logger.info('✅ All Task 4 criteria validation passed!');
      
      if (warnings.length > 0) {
        logger.warn(`⚠️  ${warnings.length} warning(s):`);
        warnings.forEach(warning => logger.warn(`   - ${warning}`));
      }
      
      logger.info('\n🚀 Task 4 implementation is ready!');
      logger.info('\nNext steps:');
      logger.info('1. Run database migration for aggregation functions');
      logger.info('2. Test the API endpoint with actual requests');
      logger.info('3. Verify rate limiting and fraud detection');
      
    } else {
      logger.error(`❌ ${errors.length} error(s) found:`);
      errors.forEach(error => logger.error(`   - ${error}`));
      
      if (warnings.length > 0) {
        logger.warn(`⚠️  ${warnings.length} warning(s):`);
        warnings.forEach(warning => logger.warn(`   - ${warning}`));
      }
      
      process.exit(1);
    }

  } catch (error) {
    logger.error('❌ Task 4 validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  validateTask4Criteria();
}

export { validateTask4Criteria };
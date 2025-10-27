#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/lib/logger';

/**
 * Validate the SQL schema file
 */
function validateSchemaFile(): boolean {
  try {
    const schemaPath = join(__dirname, '001_initial_schema.sql');
    const sqlContent = readFileSync(schemaPath, 'utf-8');

    logger.info('Validating schema file...');

    // Check for required tables
    const requiredTables = [
      'migrations',
      'matches',
      'admin_users', 
      'votes_raw',
      'vote_agg_h3',
      'vote_agg_country',
      'fraud_events',
      'audit_log'
    ];

    const missingTables = requiredTables.filter(table => 
      !sqlContent.includes(`CREATE TABLE ${table}`) && !sqlContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)
    );

    if (missingTables.length > 0) {
      logger.error(`Missing tables: ${missingTables.join(', ')}`);
      return false;
    }

    // Check for required ENUM types
    const requiredEnums = [
      'match_status',
      'team_choice', 
      'location_source',
      'fraud_severity'
    ];

    const missingEnums = requiredEnums.filter(enumType =>
      !sqlContent.includes(`CREATE TYPE ${enumType}`)
    );

    if (missingEnums.length > 0) {
      logger.error(`Missing ENUM types: ${missingEnums.join(', ')}`);
      return false;
    }

    // Check for required indexes
    const requiredIndexes = [
      'idx_votes_match_time',
      'idx_votes_fp_match',
      'idx_votes_ip_match',
      'idx_votes_h3',
      'idx_votes_deleted',
      'idx_vote_agg_match_h3',
      'idx_vote_agg_updated',
      'idx_matches_status_time',
      'idx_matches_active',
      'idx_fraud_match_severity',
      'idx_fraud_fp',
      'idx_fraud_unreviewed',
      'idx_audit_type_time',
      'idx_audit_entity'
    ];

    const missingIndexes = requiredIndexes.filter(index =>
      !sqlContent.includes(`CREATE INDEX ${index}`)
    );

    if (missingIndexes.length > 0) {
      logger.error(`Missing indexes: ${missingIndexes.join(', ')}`);
      return false;
    }

    // Check for constraints
    const requiredConstraints = [
      'team_a_color ~ \'^#[0-9A-Fa-f]{6}$\'',
      'team_b_color ~ \'^#[0-9A-Fa-f]{6}$\'',
      'end_time > start_time',
      'team_a_count >= 0',
      'team_b_count >= 0',
      'max_votes_per_user > 0'
    ];

    const missingConstraints = requiredConstraints.filter(constraint =>
      !sqlContent.includes(constraint)
    );

    if (missingConstraints.length > 0) {
      logger.error(`Missing constraints: ${missingConstraints.join(', ')}`);
      return false;
    }

    // Check for foreign key relationships
    const requiredForeignKeys = [
      'FOREIGN KEY (match_id) REFERENCES matches(id)',
      'FOREIGN KEY (created_by) REFERENCES admin_users(id)',
      'FOREIGN KEY (admin_id) REFERENCES admin_users(id)'
    ];

    const missingForeignKeys = requiredForeignKeys.filter(fk =>
      !sqlContent.includes(fk)
    );

    if (missingForeignKeys.length > 0) {
      logger.error(`Missing foreign keys: ${missingForeignKeys.join(', ')}`);
      return false;
    }

    logger.info('✅ Schema validation passed!');
    logger.info(`✅ All ${requiredTables.length} tables defined`);
    logger.info(`✅ All ${requiredEnums.length} ENUM types defined`);
    logger.info(`✅ All ${requiredIndexes.length} indexes defined`);
    logger.info(`✅ All required constraints defined`);
    logger.info(`✅ All required foreign keys defined`);

    return true;
  } catch (error) {
    logger.error('Schema validation failed:', error);
    return false;
  }
}

/**
 * Validate database helper functions by checking source code
 */
function validateHelperFunctions(): boolean {
  try {
    logger.info('Validating database helper functions...');

    const helpersPath = join(__dirname, '../src/lib/db-helpers.ts');
    const helpersContent = readFileSync(helpersPath, 'utf-8');

    const requiredFunctions = [
      'getActiveMatch',
      'getUserVoteCount', 
      'incrementVoteAggregate',
      'incrementCountryVoteAggregate',
      'getVoteAggregatesByResolution',
      'getCountryVoteAggregates'
    ];

    const missingFunctions = requiredFunctions.filter(func =>
      !helpersContent.includes(`export async function ${func}`) && 
      !helpersContent.includes(`async function ${func}`)
    );

    if (missingFunctions.length > 0) {
      logger.error(`Missing helper functions: ${missingFunctions.join(', ')}`);
      return false;
    }

    // Check for proper error handling and logging
    if (!helpersContent.includes('logger.error') || !helpersContent.includes('logger.info')) {
      logger.error('Helper functions missing proper logging');
      return false;
    }

    // Check for parameterized queries (no string concatenation in SQL)
    if (helpersContent.includes('${') && helpersContent.includes('FROM')) {
      logger.error('Potential SQL injection vulnerability detected - use parameterized queries only');
      return false;
    }

    logger.info(`✅ All ${requiredFunctions.length} helper functions defined`);
    logger.info('✅ Proper error handling and logging implemented');
    logger.info('✅ No SQL injection vulnerabilities detected');
    return true;
  } catch (error) {
    logger.error('Helper function validation failed:', error);
    return false;
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting schema validation...');

    const schemaValid = validateSchemaFile();
    const helpersValid = validateHelperFunctions();

    if (schemaValid && helpersValid) {
      logger.info('🎉 All validations passed! Database schema is ready.');
      logger.info('');
      logger.info('Next steps:');
      logger.info('1. Set up your Supabase project with real credentials in .env.local');
      logger.info('2. Run the SQL from scripts/001_initial_schema.sql in Supabase SQL editor');
      logger.info('3. Test with: pnpm migrate (after setting up credentials)');
    } else {
      logger.error('❌ Validation failed. Please fix the issues above.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Validation process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { validateSchemaFile, validateHelperFunctions };
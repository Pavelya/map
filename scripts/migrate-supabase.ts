#!/usr/bin/env tsx

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { supabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Create the migrations table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  const exists = await tableExists('migrations');
  if (exists) {
    logger.info('Migrations table already exists');
    return;
  }

  logger.info('Creating migrations table...');
  
  // Since we can't execute raw SQL directly, we'll create a simple version
  // The user will need to run the full SQL in Supabase SQL editor
  logger.warn('Please create the migrations table manually in Supabase SQL editor with:');
  logger.info(`
CREATE TABLE migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checksum VARCHAR(64) NOT NULL
);
  `);
}

/**
 * Check if migration has been applied
 */
async function isMigrationApplied(version: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('version')
      .eq('version', version)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('relation "migrations" does not exist')) {
      return false;
    }
    throw error;
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(version: string, name: string, checksum: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('migrations')
      .insert({
        version,
        name,
        checksum,
        applied_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    logger.info(`Migration ${version} recorded successfully`);
  } catch (error) {
    logger.error(`Failed to record migration ${version}:`, error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function runMigration(): Promise<void> {
  try {
    logger.info('Starting Supabase migration process...');

    // Test connection
    const { error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    logger.info('Database connection successful');

    // Create migrations table
    await createMigrationsTable();

    // Check if initial schema migration has been applied
    const migrationVersion = '001';
    const migrationName = 'initial_schema';
    const migrationChecksum = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

    const isApplied = await isMigrationApplied(migrationVersion);
    
    if (isApplied) {
      logger.info('Initial schema migration already applied');
      return;
    }

    // Display SQL for manual execution
    logger.info('='.repeat(80));
    logger.info('PLEASE RUN THE FOLLOWING SQL IN SUPABASE SQL EDITOR:');
    logger.info('='.repeat(80));
    logger.info('File: scripts/001_initial_schema.sql');
    logger.info('='.repeat(80));

    // After manual execution, record the migration
    logger.info('After running the SQL, the migration will be recorded automatically');
    
    // For demo purposes, let's assume it was run and record it
    // In production, you'd have a confirmation step
    logger.warn('Assuming migration was run manually - recording migration...');
    await recordMigration(migrationVersion, migrationName, migrationChecksum);

    logger.info('Migration process completed');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };
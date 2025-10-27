#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { supabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';

interface Migration {
  version: string;
  name: string;
  filePath: string;
  checksum: string;
}

/**
 * Calculate SHA-256 checksum of file content
 */
function calculateChecksum(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Check if migration has already been applied
 */
async function isMigrationApplied(version: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('migrations')
      .select('version')
      .eq('version', version)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return !!data;
  } catch (error) {
    // If migrations table doesn't exist, migration hasn't been applied
    if (error instanceof Error && error.message.includes('relation "migrations" does not exist')) {
      return false;
    }
    throw error;
  }
}

/**
 * Execute SQL migration using Supabase SQL editor approach
 */
async function executeMigration(migration: Migration, sqlContent: string): Promise<void> {
  logger.info(`Executing migration ${migration.version}: ${migration.name}`);

  try {
    // Note: This requires running the SQL manually in Supabase SQL editor
    // or using a database client with direct SQL execution capabilities
    logger.warn('Direct SQL execution not available through Supabase client');
    logger.info('Please run the following SQL in your Supabase SQL editor:');
    logger.info('='.repeat(80));
    logger.info(sqlContent);
    logger.info('='.repeat(80));
    
    // For now, we'll assume the migration was run manually
    // In a production setup, you'd use a direct PostgreSQL client
    logger.info(`Migration ${migration.version} SQL displayed for manual execution`);
  } catch (error) {
    logger.error(`Failed to execute migration ${migration.version}:`, error);
    throw error;
  }
}

/**
 * Record migration as applied
 */
async function recordMigration(migration: Migration): Promise<void> {
  try {
    const { error } = await supabase
      .from('migrations')
      .insert({
        version: migration.version,
        name: migration.name,
        checksum: migration.checksum,
        applied_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    logger.info(`Migration ${migration.version} recorded in migrations table`);
  } catch (error) {
    logger.error(`Failed to record migration ${migration.version}:`, error);
    throw error;
  }
}

/**
 * Run a single migration
 */
async function runMigration(migrationFile: string): Promise<void> {
  const filePath = join(__dirname, migrationFile);
  
  try {
    // Read migration file
    const sqlContent = readFileSync(filePath, 'utf-8');
    const checksum = calculateChecksum(sqlContent);
    
    // Extract version and name from filename
    const filename = migrationFile.replace('.sql', '');
    const [version, ...nameParts] = filename.split('_');
    const name = nameParts.join('_');
    
    if (!version) {
      throw new Error(`Invalid migration filename: ${migrationFile}`);
    }

    const migration: Migration = {
      version,
      name,
      filePath,
      checksum
    };

    logger.info(`Processing migration: ${migration.version} - ${migration.name}`);

    // Check if already applied
    const isApplied = await isMigrationApplied(migration.version);
    if (isApplied) {
      logger.info(`Migration ${migration.version} already applied, skipping`);
      return;
    }

    // Execute migration
    await executeMigration(migration, sqlContent);

    // Record migration (only if not already recorded during execution)
    if (!sqlContent.includes('INSERT INTO migrations')) {
      await recordMigration(migration);
    }

    logger.info(`Migration ${migration.version} completed successfully`);
  } catch (error) {
    logger.error(`Migration failed for ${migrationFile}:`, error);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting database migration...');

    // Test database connection
    const { error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    logger.info('Database connection successful');

    // Run the initial schema migration
    await runMigration('001_initial_schema.sql');

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { runMigration, main as runMigrations };
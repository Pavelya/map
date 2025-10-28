#!/usr/bin/env tsx

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { supabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';

/**
 * Execute SQL from file
 */
async function executeSQLFile(filePath: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf-8');

  // Split SQL into individual statements (split by semicolon, but be careful with strings)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  logger.info(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comments and empty lines
    if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
      continue;
    }

    try {
      logger.info(`Executing statement ${i + 1}/${statements.length}...`);

      // Execute using Supabase RPC if available, otherwise skip complex queries
      if (statement.includes('CREATE TABLE')) {
        const tableName = extractTableName(statement);
        logger.info(`Creating table: ${tableName}`);
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = extractIndexName(statement);
        logger.info(`Creating index: ${indexName}`);
      }

      // Use Supabase SQL query execution
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try to create tables using direct queries
        logger.warn(`RPC failed, attempting direct execution: ${error.message}`);

        // For now, we'll log that manual execution is needed
        logger.info('Please run the setup-database.sql file manually in Supabase SQL Editor');
        return;
      }

      logger.info(`Statement ${i + 1} executed successfully`);
    } catch (error) {
      logger.error(`Error executing statement ${i + 1}:`, error);
      throw error;
    }
  }
}

function extractTableName(sql: string): string {
  const match = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?([a-z_]+)/i);
  return match ? match[1] : 'unknown';
}

function extractIndexName(sql: string): string {
  const match = sql.match(/CREATE INDEX (?:IF NOT EXISTS )?([a-z_]+)/i);
  return match ? match[1] : 'unknown';
}

/**
 * Verify tables exist
 */
async function verifyTables(): Promise<boolean> {
  const requiredTables = [
    'admin_users',
    'matches',
    'votes',
    'fraud_events',
    'vote_aggregates',
    'migrations'
  ];

  logger.info('Verifying database tables...');

  for (const tableName of requiredTables) {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);

    if (error) {
      logger.error(`Table '${tableName}' does not exist or is not accessible`);
      return false;
    }

    logger.info(`✓ Table '${tableName}' exists`);
  }

  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Team Vote Map - Database Setup');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Check if tables already exist
    const tablesExist = await verifyTables();

    if (tablesExist) {
      console.log('');
      console.log('✓ All database tables already exist!');
      console.log('');
      console.log('Database is ready to use.');
      console.log('');
      console.log('Next step: Create an admin user by running:');
      console.log('  pnpm create-admin');
      console.log('');
      process.exit(0);
    }

    console.log('');
    console.log('⚠️  Database tables need to be created.');
    console.log('');
    console.log('Please follow these steps:');
    console.log('');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Click "SQL Editor" in the left sidebar');
    console.log('4. Click "New Query"');
    console.log('5. Copy the contents of: scripts/setup-database.sql');
    console.log('6. Paste into the SQL editor');
    console.log('7. Click "Run"');
    console.log('');
    console.log('The SQL file contains all necessary tables, indexes, and functions.');
    console.log('');
    console.log('After running the SQL, you can verify the setup by running:');
    console.log('  pnpm tsx scripts/setup-database.ts');
    console.log('');

    process.exit(1);
  } catch (error) {
    console.error('');
    console.error('Error during database setup:');

    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    } else {
      console.error('  An unknown error occurred');
    }

    console.error('');
    logger.error('Database setup failed', { error });
    process.exit(1);
  }
}

// Run the script
main();

#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { supabase } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function runSQLMigration(sqlFile: string) {
  try {
    logger.info(`Running SQL migration: ${sqlFile}`);
    
    const sqlContent = readFileSync(sqlFile, 'utf-8');
    
    // Split SQL content by statements (simple approach)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    for (const statement of statements) {
      if (statement.toLowerCase().includes('create or replace function')) {
        // For functions, we need to use rpc
        logger.info('Executing function creation via SQL editor (manual step required)');
        logger.info('Please run this SQL in your Supabase SQL editor:');
        logger.info('='.repeat(80));
        logger.info(statement + ';');
        logger.info('='.repeat(80));
      } else if (statement.toLowerCase().includes('insert into migrations')) {
        // Handle migration record insertion
        const versionMatch = statement.match(/VALUES\s*\(\s*'(\d+)'/);
        const nameMatch = statement.match(/'([^']+)',\s*'([^']+)'/);
        
        if (versionMatch && nameMatch) {
          const version = versionMatch[1];
          const name = nameMatch[2];
          
          const { error } = await supabase
            .from('migrations')
            .insert({
              version,
              name,
              checksum: 'manual_migration_' + Date.now()
            });
            
          if (error) {
            logger.error('Failed to record migration', { error });
          } else {
            logger.info(`Migration ${version} recorded successfully`);
          }
        }
      }
    }
    
    logger.info('Migration completed (manual SQL execution required for functions)');
  } catch (error) {
    logger.error('Migration failed', { error });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    logger.error('Please provide SQL file path');
    process.exit(1);
  }
  runSQLMigration(sqlFile);
}
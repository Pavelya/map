import { logger } from './logger';
import { testConnection } from './db';

export async function testSetup(): Promise<void> {
  try {
    // Test logger
    logger.info('Testing logger setup...');
    logger.debug('Debug level logging works');
    logger.warn('Warning level logging works');
    logger.error('Error level logging works');
    logger.info('Logger test completed successfully');

    // Test database connection (only if environment variables are properly set)
    if (process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['SUPABASE_SERVICE_ROLE_KEY']) {
      if (process.env['NEXT_PUBLIC_SUPABASE_URL'] !== 'https://your-project.supabase.co') {
        await testConnection();
        logger.info('Database connection test completed successfully');
      } else {
        logger.warn('Skipping database connection test - using placeholder values');
      }
    } else {
      logger.warn('Skipping database connection test - environment variables not set');
    }

    logger.info('Setup validation completed successfully');
  } catch (error) {
    logger.error('Setup validation failed:', error);
    throw error;
  }
}
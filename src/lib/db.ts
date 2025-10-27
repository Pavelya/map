import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Validate required environment variables
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl) {
  const error = 'NEXT_PUBLIC_SUPABASE_URL environment variable is required';
  logger.error(error);
  throw new Error(error);
}

if (!supabaseServiceRoleKey) {
  const error = 'SUPABASE_SERVICE_ROLE_KEY environment variable is required';
  logger.error(error);
  throw new Error(error);
}

// Create Supabase client with service role key for server-side operations
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Test database connection
export const testConnection = async (): Promise<boolean> => {
  try {
    logger.info('Testing database connection...');
    
    // Simple query to test connection
    const { error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
    
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

// Export the supabase client
export { supabase };
export default supabase;
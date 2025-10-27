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

/**
 * Execute a raw SQL query using Supabase
 * @param sql - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  try {
    // Use Supabase's RPC or direct query functionality
    // For now, we'll use the from() method with filters
    // Note: This is a simplified implementation
    // In production, you might want to use a PostgreSQL client directly

    // For admin_users table operations
    if (sql.includes('admin_users')) {
      if (sql.includes('INSERT')) {
        // Parse INSERT statement
        const values = params || [];
        const { data, error } = await supabase
          .from('admin_users')
          .insert({
            username: values[0],
            password_hash: values[1],
            email: values[2],
          })
          .select();

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('SELECT') && sql.includes('WHERE username')) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('username', params?.[0])
          .limit(1);

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('SELECT') && sql.includes('WHERE id')) {
        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', params?.[0])
          .limit(1);

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('UPDATE') && sql.includes('last_login_at')) {
        const { data, error } = await supabase
          .from('admin_users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', params?.[0])
          .select();

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('UPDATE') && sql.includes('password_hash')) {
        const { data, error } = await supabase
          .from('admin_users')
          .update({ password_hash: params?.[0] })
          .eq('id', params?.[1])
          .select();

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('DELETE')) {
        const { data, error } = await supabase
          .from('admin_users')
          .delete()
          .like('username', params?.[0] || '')
          .select();

        if (error) throw error;
        return { rows: data as T[] };
      } else if (sql.includes('COUNT')) {
        if (sql.includes('WHERE username')) {
          const { count, error } = await supabase
            .from('admin_users')
            .select('*', { count: 'exact', head: true })
            .eq('username', params?.[0]);

          if (error) throw error;
          return { rows: [{ count: count || 0 }] as T[] };
        } else if (sql.includes('WHERE email')) {
          const { count, error } = await supabase
            .from('admin_users')
            .select('*', { count: 'exact', head: true })
            .eq('email', params?.[0]);

          if (error) throw error;
          return { rows: [{ count: count || 0 }] as T[] };
        }
      }
    }

    logger.error('Unsupported query:', { sql });
    throw new Error('Unsupported query operation');
  } catch (error) {
    logger.error('Query execution failed:', { error, sql });
    throw error;
  }
}

// Export the supabase client
export { supabase };
export default supabase;
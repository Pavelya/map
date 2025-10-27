#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testBasicFunctionality() {
  console.log('Testing Task 5 basic functionality...');
  
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('matches')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database connection failed:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Test if aggregation functions exist
    const { data: functions, error: funcError } = await supabase
      .rpc('increment_h3_aggregate', {
        p_match_id: '00000000-0000-0000-0000-000000000000',
        p_h3_index: 'test',
        p_h3_resolution: 10,
        p_team_choice: 'team_a'
      });
    
    if (funcError && !funcError.message.includes('function increment_h3_aggregate')) {
      console.log('✅ increment_h3_aggregate function exists');
    } else {
      console.log('❌ increment_h3_aggregate function missing');
    }
    
    console.log('Basic functionality test completed');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBasicFunctionality();
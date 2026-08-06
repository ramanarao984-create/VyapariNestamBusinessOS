/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient } from './client';

/**
 * Basic connection and health utility for the Supabase metadata database.
 * This will perform a lightweight head-only select to verify configuration/credentials.
 */
export async function checkDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Perform a minimal check to see if we can reach the database
    // We try to query a simple built-in schema detail or any table
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    if (error) {
      // Code '42P01' is relation (table) does not exist.
      // This means connection worked, but the tables aren't created yet (expected in Step 1).
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase successfully. (Note: Database schema is not yet applied).'
        };
      }
      throw error;
    }

    return {
      success: true,
      message: 'Supabase database connection established and verified successfully.'
    };
  } catch (err: any) {
    console.error('[Supabase DB Utils] Connection verification failed:', err.message || err);
    return {
      success: false,
      message: err.message || 'Database connection failed.'
    };
  }
}

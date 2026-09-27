import { createClient } from '@supabase/supabase-js';

export async function testSupabaseConnection(url?: string, key?: string): Promise<{ valid: boolean; message: string; details?: any }> {
  const sbUrl = url || process.env.SUPABASE_URL;
  const sbKey = key || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!sbUrl || !sbKey || sbKey.includes('Demo')) {
    return { valid: false, message: 'Supabase connection is not configured.' };
  }

  try {
    const client = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { count, error } = await client.from('api_tokens').select('*', { count: 'exact', head: true });

    if (error) {
      // Table might not exist yet, check basic connection
      return {
        valid: false,
        message: 'Supabase could not read the required table',
        details: { error: error.message },
      };
    }

    return {
      valid: true,
      message: `Connected successfully to Supabase. Found ${count ?? 0} active token records.`,
      details: { recordCount: count },
    };
  } catch (err: any) {
    return {
      valid: false,
      message: err.message || 'Failed to connect to Supabase endpoint',
    };
  }
}

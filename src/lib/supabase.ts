import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://evxmyqnsiapiojsukxmh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2eG15cW5zaWFwaW9qc3VreG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjkwODMsImV4cCI6MjA4ODEwNTA4M30.1MnMGPWmjvXm4nUB7ZAPdZSKAMVU4npDcgyyhMbrzlo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper to check Supabase connection health
export async function checkSupabaseConnection(): Promise<{ connected: boolean; hasAurTables: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('aur_branches').select('count', { count: 'exact', head: true });
    if (error) {
      // If table doesn't exist yet (404/PGRST204)
      if (error.code === 'PGRST204' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          connected: true,
          hasAurTables: false,
          message: 'Connected to Supabase, but aur_* tables have not been created yet. Please execute the SQL migration script in your Supabase SQL Editor.',
        };
      }
      return { connected: false, hasAurTables: false, message: error.message };
    }
    return { connected: true, hasAurTables: true, message: 'Connected to Supabase with active aur_* tables!' };
  } catch (err: any) {
    return { connected: false, hasAurTables: false, message: err?.message || 'Network error' };
  }
}

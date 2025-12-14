import { createClient } from '@supabase/supabase-js';

// Access environment variables using process.env
// Ensure these variables are set in your deployment platform (Vercel, Netlify, etc.)

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = !!supabase;
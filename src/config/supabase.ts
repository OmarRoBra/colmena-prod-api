import { createClient } from '@supabase/supabase-js';
import { config } from './env';

export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

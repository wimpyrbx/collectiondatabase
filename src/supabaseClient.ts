import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enable realtime for specific tables
supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'inventory'
    },
    (payload) => console.log('Change received!', payload)
  )
  .subscribe(); 
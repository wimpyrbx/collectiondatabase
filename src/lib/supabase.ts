import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/supabaseClient';

interface SupabaseContext {
  supabase: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContext | undefined>(undefined);

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    // Instead of throwing an error, we'll return the default supabase client
    // This makes the hook usable without the context provider
    return { supabase };
  }
  return context;
}

export const SupabaseProvider = SupabaseContext.Provider; 
import { supabase } from '@/supabaseClient';

/**
 * Creates a type-safe query function for Supabase views
 * @param viewName The name of the Supabase view to query
 * @returns A query function that returns an array of the specified type
 */
export function createSupabaseQuery<T>(viewName: string) {
  return async (): Promise<T[]> => {
    const { data, error } = await supabase.from(viewName).select('*');
    if (error) throw error;
    return data;
  };
} 
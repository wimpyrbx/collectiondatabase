import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { fetchAllPages } from './supabaseUtils';

export async function invalidateAndRefetch<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  options: {
    tableName: string;
    orderBy?: { column: string; ascending?: boolean };
  }
) {
  // First invalidate the query
  await queryClient.invalidateQueries({ queryKey });

  // Then fetch new data with pagination support
  const { data, error } = await fetchAllPages<T>(
    supabase,
    options.tableName,
    {
      orderBy: options.orderBy
    }
  );

  if (error) {
    console.error('Error refetching data:', error);
    return;
  }

  // Update the cache with new data
  queryClient.setQueryData(queryKey, data);
}

// Helper function to determine if a table/view needs pagination
export async function needsPagination(tableName: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count ? count > 1000 : false;
  } catch (error) {
    console.error('Error checking pagination need:', error);
    return false;
  }
} 
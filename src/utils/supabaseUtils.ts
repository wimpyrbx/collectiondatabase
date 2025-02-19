import { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
  supabaseClient: SupabaseClient,
  tableName: string,
  options: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    filters?: { column: string; operator: string; value: any }[];
  } = {}
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    // First, get the total count
    const { count, error: countError } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    if (!count) return { data: [], error: null };

    // If count is less than or equal to PAGE_SIZE, do a single fetch
    if (count <= PAGE_SIZE) {
      const query = supabaseClient
        .from(tableName)
        .select(options.select || '*');

      // Apply filters if any
      if (options.filters) {
        options.filters.forEach(filter => {
          query.filter(filter.column, filter.operator, filter.value);
        });
      }

      // Apply ordering if specified
      if (options.orderBy) {
        query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      return { data: data as T[], error: null };
    }

    // For larger datasets, fetch in pages
    const pages = Math.ceil(count / PAGE_SIZE);
    const allData: T[] = [];

    for (let page = 0; page < pages; page++) {
      const query = supabaseClient
        .from(tableName)
        .select(options.select || '*')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Apply filters if any
      if (options.filters) {
        options.filters.forEach(filter => {
          query.filter(filter.column, filter.operator, filter.value);
        });
      }

      // Apply ordering if specified
      if (options.orderBy) {
        query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true
        });
      }

      const { data, error } = await query;
      if (error) throw error;
      if (data) allData.push(...(data as T[]));
    }

    return { data: allData, error: null };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { data: null, error: error as Error };
  }
}

export async function fetchViewData<T>(
  supabaseClient: SupabaseClient,
  viewName: string,
  options: {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    filters?: { column: string; operator: string; value: any }[];
  } = {}
): Promise<{ data: T[] | null; error: Error | null }> {
  // Views work the same way as tables for fetching
  return fetchAllPages<T>(supabaseClient, viewName, options);
} 
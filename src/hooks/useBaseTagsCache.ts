import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { BaseTag } from '@/types/tags';

interface UseBaseTagsCacheProps {
  tableName: 'products_tags' | 'inventory_tags';
  queryKey: string[];
}

const fetchTags = async (tableName: string) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('tags_display_in_table_order', { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return data;
};

export const useBaseTagsCache = ({ tableName, queryKey }: UseBaseTagsCacheProps) => {
  return useQuery<BaseTag[]>({
    queryKey,
    queryFn: () => fetchTags(tableName),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}; 
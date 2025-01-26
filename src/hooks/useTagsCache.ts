import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { TagsRelationshipView, TagsByIdGetter } from '@/types/tags';

export const TAGS_QUERY_KEY = ['tags'] as const;

interface TagWithValue {
  name: string;
  value: string | null;
}

const fetchTags = async (): Promise<TagsRelationshipView> => {
  const { data, error } = await supabase
    .from('view_tags_relationship')
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const useTagsCache = () => {
  const { data, ...rest } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: fetchTags,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  // Helper function to get tags by ID and scope
  const getTags = (id: number, scope: 'products' | 'inventory'): string[] => {
    if (!data?.combined_data[scope]) return [];
    const tags = data.combined_data[scope][id.toString()];
    if (!tags) return [];
    return tags;
  };

  return {
    data,
    getTags,
    ...rest
  };
}; 
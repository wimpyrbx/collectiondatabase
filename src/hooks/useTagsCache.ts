import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { TagsRelationshipView, TagsByIdGetter } from '@/types/tags';

export const TAGS_QUERY_KEY = ['tags'] as const;

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

  // Helper functions to get tags by ID
  const getProductTags: TagsByIdGetter = (productId) => {
    if (!data?.combined_data.products) return undefined;
    return data.combined_data.products[productId.toString()];
  };

  const getInventoryTags: TagsByIdGetter = (inventoryId) => {
    if (!data?.combined_data.inventory) return undefined;
    return data.combined_data.inventory[inventoryId.toString()];
  };

  // Helper to get both inventory and product tags for an inventory item
  const getInventoryWithProductTags = (inventoryId: number, productId: number | null) => {
    const inventoryTags = getInventoryTags(inventoryId);
    const productTags = productId ? getProductTags(productId) : undefined;

    return {
      inventoryTags,
      productTags,
      // Combine both sets of tags, removing duplicates
      allTags: [...new Set([...(inventoryTags || []), ...(productTags || [])])]
    };
  };

  return {
    data,
    getProductTags,
    getInventoryTags,
    getInventoryWithProductTags,
    ...rest
  };
}; 
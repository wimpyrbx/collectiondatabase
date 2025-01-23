import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { InventoryTag } from '@/types/tags';

export const INVENTORY_TAGS_QUERY_KEY = ['inventory_tags'] as const;

const fetchInventoryTags = async (): Promise<InventoryTag[]> => {
  console.log('=== Inventory Tags Debug ===');
  console.log('Fetching inventory tags...');
  const { data, error } = await supabase
    .from('inventory_tags')
    .select('*');

  if (error) {
    console.error('Error fetching inventory tags:', error);
    throw error;
  }

  console.log('Raw inventory tags response:', { data, error });
  console.log('Number of inventory tags:', data?.length ?? 0);
  if (data && data.length > 0) {
    console.log('First inventory tag:', data[0]);
    console.log('All inventory tags:', data);
  } else {
    console.log('No inventory tags found');
  }
  console.log('=== End Inventory Tags Debug ===');
  return data;
};

export const useInventoryTagsCache = () => {
  return useQuery({
    queryKey: INVENTORY_TAGS_QUERY_KEY,
    queryFn: fetchInventoryTags,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}; 
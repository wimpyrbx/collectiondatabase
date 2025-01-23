import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { InventoryViewItem } from '@/types/inventory';

export const INVENTORY_QUERY_KEY = ['inventory'] as const;

const fetchInventory = async (): Promise<InventoryViewItem[]> => {
  const { data, error } = await supabase
    .from('view_inventory')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useInventoryCache = () => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: fetchInventory,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
};
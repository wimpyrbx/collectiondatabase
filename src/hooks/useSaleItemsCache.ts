import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { SaleItemViewItem } from '@/types/sale';

export const SALE_ITEMS_QUERY_KEY = ['sale_items'] as const;

const fetchSaleItems = async (): Promise<SaleItemViewItem[]> => {
  const { data, error } = await supabase
    .from('view_sale_items')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useSaleItemsCache = () => {
  return useQuery({
    queryKey: SALE_ITEMS_QUERY_KEY,
    queryFn: fetchSaleItems,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}; 
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { SaleViewItem } from '@/types/sale';

export const SALES_QUERY_KEY = ['sales'] as const;

const fetchSales = async (): Promise<SaleViewItem[]> => {
  const { data, error } = await supabase
    .from('view_sales')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useSales = () => {
  return useQuery({
    queryKey: SALES_QUERY_KEY,
    queryFn: fetchSales,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}; 
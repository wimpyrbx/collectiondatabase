import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ProductViewItem } from '@/types/product';

export const PRODUCTS_QUERY_KEY = ['products'] as const;

const fetchProducts = async (): Promise<ProductViewItem[]> => {
  const { data, error } = await supabase
    .from('view_products')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useProductsCache = () => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: fetchProducts,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}; 
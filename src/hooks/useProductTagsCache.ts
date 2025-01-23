import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { ProductTag } from '@/types/tags';

export const PRODUCT_TAGS_QUERY_KEY = ['products_tags'] as const;

const fetchProductTags = async (): Promise<ProductTag[]> => {
  console.log('=== Product Tags Debug ===');
  console.log('Fetching product tags...');
  const { data, error } = await supabase
    .from('products_tags')
    .select('*');

  if (error) {
    console.error('Error fetching product tags:', error);
    throw error;
  }

  console.log('Raw product tags response:', { data, error });
  console.log('Number of product tags:', data?.length ?? 0);
  if (data && data.length > 0) {
    console.log('First product tag:', data[0]);
    console.log('All product tags:', data);
  } else {
    console.log('No product tags found');
  }
  console.log('=== End Product Tags Debug ===');
  return data;
};

export const useProductTagsCache = () => {
  return useQuery({
    queryKey: PRODUCT_TAGS_QUERY_KEY,
    queryFn: fetchProductTags,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });
}; 
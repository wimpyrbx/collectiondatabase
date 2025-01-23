import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ProductViewItem } from '@/types/product';

const fetchProducts = async (): Promise<ProductViewItem[]> => {
  const { data, error } = await supabase.from('view_products').select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const useProducts = () => {
  return useQuery<ProductViewItem[]>({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
}; 
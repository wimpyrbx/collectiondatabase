import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { ProductService } from '@/services/ProductService';

export function useProductService() {
  const queryClient = useQueryClient();
  
  const productService = useMemo(() => 
    new ProductService(
      supabase,
      queryClient,
      'products',
      {
        queryKey: ['products']
      }
    ),
    [queryClient]
  );

  return productService;
} 
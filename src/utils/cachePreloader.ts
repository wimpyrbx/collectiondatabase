import { QueryClient } from '@tanstack/react-query';
import { PRODUCTS_QUERY_KEY } from '@/hooks/useProductsCache';
import { INVENTORY_QUERY_KEY } from '@/hooks/useInventoryCache';
import { SALES_QUERY_KEY } from '@/hooks/useSalesCache';
import { SALE_ITEMS_QUERY_KEY } from '@/hooks/useSaleItemsCache';
import { TAGS_QUERY_KEY } from '@/hooks/useTagsCache';
import { PRODUCT_TAGS_QUERY_KEY } from '@/hooks/useProductTagsCache';
import { INVENTORY_TAGS_QUERY_KEY } from '@/hooks/useInventoryTagsCache';
import { supabase } from '@/supabaseClient';

export const preloadQueries = async (queryClient: QueryClient) => {
  const preloadPromises = [
    // Products
    queryClient.prefetchQuery({
      queryKey: PRODUCTS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('view_products').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Inventory
    queryClient.prefetchQuery({
      queryKey: INVENTORY_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('view_inventory').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Sales
    queryClient.prefetchQuery({
      queryKey: SALES_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('view_sales').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Sale Items
    queryClient.prefetchQuery({
      queryKey: SALE_ITEMS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('view_sale_items').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Tags
    queryClient.prefetchQuery({
      queryKey: TAGS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('view_tags_relationship').select('*').single();
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Product Tags
    queryClient.prefetchQuery({
      queryKey: PRODUCT_TAGS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('products_tags').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Inventory Tags
    queryClient.prefetchQuery({
      queryKey: INVENTORY_TAGS_QUERY_KEY,
      queryFn: async () => {
        const { data, error } = await supabase.from('inventory_tags').select('*');
        if (error) throw error;
        return data;
      },
      staleTime: Infinity,
      gcTime: Infinity,
    }),

    // Add more queries here as needed
  ];

  await Promise.all(preloadPromises);
}; 
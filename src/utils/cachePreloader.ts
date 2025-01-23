import { QueryClient } from '@tanstack/react-query';
import { PRODUCTS_QUERY_KEY } from '@/hooks/useProducts';
import { INVENTORY_QUERY_KEY } from '@/hooks/useInventory';
import { SALES_QUERY_KEY } from '@/hooks/useSales';
import { SALE_ITEMS_QUERY_KEY } from '@/hooks/useSaleItems';
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

    // Add more queries here as needed
  ];

  await Promise.all(preloadPromises);
}; 
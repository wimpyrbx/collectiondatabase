import { QueryClient } from '@tanstack/react-query';
import { createQueryOptions, PREFETCH_OPTIONS } from '@/config/queryConfig';
import {
  productsConfig,
  inventoryConfig,
  SALES_KEY,
  PURCHASES_KEY,
  saleItemsConfig,
} from '@/hooks/viewHooks';

export const preloadQueries = async (queryClient: QueryClient) => {
  const preloadPromises = [
    // Products
    queryClient.prefetchQuery(
      createQueryOptions({
        ...productsConfig,
        ...PREFETCH_OPTIONS,
      })
    ),

    // Inventory
    queryClient.prefetchQuery(
      createQueryOptions({
        ...inventoryConfig,
        ...PREFETCH_OPTIONS,
      })
    ),

    // Sales
    queryClient.prefetchQuery({
      queryKey: SALES_KEY,
      ...PREFETCH_OPTIONS,
    }),

    // Purchases
    queryClient.prefetchQuery({
      queryKey: PURCHASES_KEY,
      ...PREFETCH_OPTIONS,
    }),

    // Sale Items
    queryClient.prefetchQuery(
      createQueryOptions({
        ...saleItemsConfig,
        ...PREFETCH_OPTIONS,
      })
    ),
  ];

  await Promise.all(preloadPromises);
}; 
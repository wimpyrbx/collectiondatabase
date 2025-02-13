import { QueryClient } from '@tanstack/react-query';
import { createQueryOptions, PREFETCH_OPTIONS } from '@/config/queryConfig';
import {
  productsConfig,
  inventoryConfig,
  salesConfig,
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
    queryClient.prefetchQuery(
      createQueryOptions({
        ...salesConfig,
        ...PREFETCH_OPTIONS,
      })
    ),

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
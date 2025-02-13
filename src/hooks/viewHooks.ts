import { ProductViewItem } from '@/types/product';
import { InventoryViewItem } from '@/types/inventory';
import { SaleViewItem, SaleItemViewItem } from '@/types/sale';
import { createViewHook } from './createViewHook';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { InventoryStatusTransition, InventoryStatusTransitionMap } from '@/types/inventory_status';

// Products
export const {
  queryKey: PRODUCTS_QUERY_KEY,
  config: productsConfig,
  useHook: useProductsCache,
} = createViewHook<ProductViewItem>({
  name: 'products',
  viewName: 'products',
});

// Inventory
export const {
  queryKey: INVENTORY_QUERY_KEY,
  config: inventoryConfig,
  useHook: useInventoryCache,
} = createViewHook<InventoryViewItem>({
  name: 'inventory',
  viewName: 'inventory',
});

// Sales
export const {
  queryKey: SALES_QUERY_KEY,
  config: salesConfig,
  useHook: useSalesCache,
} = createViewHook<SaleViewItem>({
  name: 'sales',
  viewName: 'sales',
});

// Sale Items
export const {
  queryKey: SALE_ITEMS_QUERY_KEY,
  config: saleItemsConfig,
  useHook: useSaleItemsCache,
} = createViewHook<SaleItemViewItem>({
  name: 'sale_items',
  viewName: 'sale_items',
});

// Inventory Status Transitions
export const INVENTORY_STATUS_TRANSITIONS_QUERY_KEY = ['inventory_status_transitions'] as const;

const fetchInventoryStatusTransitions = async (): Promise<InventoryStatusTransition[]> => {
  const { data, error } = await supabase
    .from('inventory_status_transitions')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useInventoryStatusTransitionsCache = () => {
  const query = useQuery({
    queryKey: INVENTORY_STATUS_TRANSITIONS_QUERY_KEY,
    queryFn: fetchInventoryStatusTransitions,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (data): InventoryStatusTransitionMap => {
      // Convert the flat list into a nested map for easier lookup
      return data.reduce((acc, transition) => {
        if (!acc[transition.from_status]) {
          acc[transition.from_status] = {};
        }
        acc[transition.from_status][transition.to_status] = {
          requires_sale_status: transition.requires_sale_status
        };
        return acc;
      }, {} as InventoryStatusTransitionMap);
    }
  });

  const isTransitionAllowed = (fromStatus: string, toStatus: string): boolean => {
    const transitions = query.data;
    if (!transitions) return false;
    return !!transitions[fromStatus]?.[toStatus];
  };

  const getRequiredSaleStatus = (fromStatus: string, toStatus: string): string | null => {
    const transitions = query.data;
    if (!transitions) return null;
    return transitions[fromStatus]?.[toStatus]?.requires_sale_status ?? null;
  };

  return {
    transitions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isTransitionAllowed,
    getRequiredSaleStatus
  };
}; 
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { ProductViewItem } from '@/types/product';
import type { InventoryViewItem } from '@/types/inventory';
import type { SaleViewItem, SaleItemViewItem } from '@/types/sale';
import type { InventoryStatusTransition, InventoryStatusTransitionMap } from '@/types/inventory_status';
import { fetchViewData, fetchAllPages } from '@/utils/supabaseUtils';
import { useSupabase } from '@/lib/supabase';

// Products
export const PRODUCTS_QUERY_KEY = ['products'] as const;
export const productsConfig = {
  queryKey: PRODUCTS_QUERY_KEY,
  viewName: 'view_products'
};

export const useProductsCache = () => {
  return useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await fetchViewData<ProductViewItem>(
        supabase,
        'view_products',
        {
          orderBy: { column: 'product_title', ascending: true }
        }
      );
      if (error) throw error;
      return data;
    }
  });
};

// Inventory
export const INVENTORY_QUERY_KEY = ['inventory'] as const;
export const inventoryConfig = {
  queryKey: INVENTORY_QUERY_KEY,
  viewName: 'view_inventory'
};

export const useInventoryCache = () => {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await fetchViewData<InventoryViewItem>(
        supabase,
        'view_inventory',
        {
          orderBy: { column: 'inventory_created_at', ascending: false }
        }
      );
      if (error) throw error;
      return data;
    }
  });
};

// Sales
export const SALES_QUERY_KEY = ['sales'] as const;
export const salesConfig = {
  queryKey: SALES_QUERY_KEY,
  viewName: 'view_sales'
};

export const useSalesCache = () => {
  return useQuery({
    queryKey: SALES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await fetchViewData<SaleViewItem>(
        supabase,
        'view_sales',
        {
          orderBy: { column: 'created_at', ascending: false }
        }
      );
      if (error) throw error;
      return data;
    }
  });
};

// Sale Items
export const SALE_ITEMS_QUERY_KEY = ['sale_items'] as const;
export const saleItemsConfig = {
  queryKey: SALE_ITEMS_QUERY_KEY,
  viewName: 'view_sale_items'
};

export const useSaleItemsCache = () => {
  return useQuery({
    queryKey: SALE_ITEMS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await fetchViewData<SaleItemViewItem>(
        supabase,
        'view_sale_items',
        {
          orderBy: { column: 'sale_id', ascending: true }
        }
      );
      if (error) throw error;
      return data;
    }
  });
};

// Inventory Status Transitions
export const INVENTORY_STATUS_TRANSITIONS_KEY = ['inventory_status_transitions'] as const;
export const inventoryStatusTransitionsConfig = {
  queryKey: INVENTORY_STATUS_TRANSITIONS_KEY,
  tableName: 'inventory_status_transitions'
};

export const useInventoryStatusTransitionsCache = () => {
  const { data: transitions } = useQuery({
    queryKey: INVENTORY_STATUS_TRANSITIONS_KEY,
    queryFn: async () => {
      const { data, error } = await fetchAllPages<InventoryStatusTransition>(
        supabase,
        'inventory_status_transitions'
      );
      if (error) throw error;

      // Convert array to map for easier lookup
      const transitionMap: Record<string, Record<string, boolean>> = {};
      data?.forEach((transition: InventoryStatusTransition) => {
        if (!transitionMap[transition.from_status]) {
          transitionMap[transition.from_status] = {};
        }
        transitionMap[transition.from_status][transition.to_status] = true;
      });
      return transitionMap;
    }
  });

  const isTransitionAllowed = (fromStatus: string, toStatus: string): boolean => {
    if (!transitions) return false;
    return !!transitions[fromStatus]?.[toStatus];
  };

  const getRequiredSaleStatus = (fromStatus: string, toStatus: string): string | null => {
    // Add logic to get required sale status if needed
    return null;
  };

  return {
    transitions,
    isTransitionAllowed,
    getRequiredSaleStatus
  };
};

export const useProductGroups = () => {
  return useQuery({
    queryKey: ['product_groups'],
    queryFn: async () => {
      const productGroupsData = await import('@/data/product_groups.json');
      return productGroupsData.groups.map(group => group.name);
    }
  });
};

export const useProductTypes = () => {
  return useQuery({
    queryKey: ['product_types'],
    queryFn: async () => {
      const productTypesData = await import('@/data/product_types.json');
      return productTypesData.types.map(type => type.name);
    }
  });
}; 
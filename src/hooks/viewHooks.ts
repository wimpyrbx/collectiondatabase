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
export const SALES_KEY = ['sales'] as const;

export const useSalesCache = () => {
  return useQuery({
    queryKey: SALES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_sales')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const useSaleWithItems = (saleId: number) => {
  return useQuery({
    queryKey: [...SALES_KEY, saleId],
    queryFn: async () => {
      // First get the sale
      const { data: sale, error: saleError } = await supabase
        .from('view_sales')
        .select('*')
        .eq('sale_id', saleId)
        .single();
      
      if (saleError) throw saleError;
      
      // Then get the sale items with inventory details
      const { data: items, error: itemsError } = await supabase
        .from('view_sale_items')
        .select('*')
        .eq('sale_id', saleId);
      
      if (itemsError) throw itemsError;
      
      return {
        ...sale,
        items: items || []
      };
    },
    enabled: Boolean(saleId)
  });
};

// Purchases
export const PURCHASES_KEY = ['purchases'] as const;

export const usePurchasesCache = () => {
  return useQuery({
    queryKey: PURCHASES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });
};

export const usePurchaseWithItems = (purchaseId: number) => {
  return useQuery({
    queryKey: [...PURCHASES_KEY, purchaseId],
    queryFn: async () => {
      // First get the purchase
      const { data: purchase, error: purchaseError } = await supabase
        .from('view_purchases')
        .select('*')
        .eq('purchase_id', purchaseId)
        .single();
      
      if (purchaseError) throw purchaseError;
      
      // Then get the inventory items connected to this purchase
      const { data: items, error: itemsError } = await supabase
        .from('view_inventory')
        .select('*')
        .eq('purchase_id', purchaseId);
      
      if (itemsError) throw itemsError;
      
      return {
        ...purchase,
        items: items || []
      };
    },
    enabled: Boolean(purchaseId)
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
      const transitionMap: InventoryStatusTransitionMap = {};
      data?.forEach((transition: InventoryStatusTransition) => {
        if (!transitionMap[transition.from_status]) {
          transitionMap[transition.from_status] = {};
        }
        transitionMap[transition.from_status][transition.to_status] = {
          requires_sale_status: transition.requires_sale_status
        };
      });
      return transitionMap;
    }
  });

  const isTransitionAllowed = (fromStatus: string, toStatus: string, currentSaleStatus?: string | null): boolean => {
    if (!transitions) return false;
    const transition = transitions[fromStatus]?.[toStatus];
    if (!transition) return false;
    
    // Only check sale status for Sold -> For Sale transition
    if (fromStatus === "Sold" && toStatus === "For Sale") {
      return currentSaleStatus === "Reserved";
    }
    
    return true;
  };

  const getRequiredSaleStatus = (fromStatus: string, toStatus: string): string | null => {
    // Only return required sale status for Sold -> For Sale transition
    if (fromStatus === "Sold" && toStatus === "For Sale") {
      return "Reserved";
    }
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
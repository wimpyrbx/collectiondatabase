import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { InventoryViewItem } from '@/types/inventory';
import { INVENTORY_QUERY_KEY } from './useInventoryCache';

interface InventoryUpdate {
  inventory_status?: string;
  override_price?: number | null;
  purchase_seller?: string | null;
  purchase_origin?: string | null;
  purchase_cost?: number | null;
  purchase_date?: string | null;
  purchase_notes?: string | null;
  sale_buyer?: string | null;
  sale_status?: string | null;
  sale_date?: string | null;
  sale_notes?: string | null;
  sold_price?: number | null;
}

export const useInventoryTable = () => {
  const queryClient = useQueryClient();

  // Update mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: InventoryUpdate }) => {
      const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: INVENTORY_QUERY_KEY });

      const previousInventory = queryClient.getQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY);

      // Optimistically update the cache
      if (previousInventory) {
        queryClient.setQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY, old => {
          if (!old) return [];
          return old.map(item => 
            item.inventory_id === id 
              ? {
                  ...item,
                  inventory_status: updates.inventory_status ?? item.inventory_status,
                  override_price: updates.override_price ?? item.override_price,
                  purchase_seller: updates.purchase_seller ?? item.purchase_seller,
                  purchase_origin: updates.purchase_origin ?? item.purchase_origin,
                  purchase_cost: updates.purchase_cost ?? item.purchase_cost,
                  purchase_date: updates.purchase_date ?? item.purchase_date,
                  purchase_notes: updates.purchase_notes ?? item.purchase_notes,
                  sale_buyer: updates.sale_buyer ?? item.sale_buyer,
                  sale_status: updates.sale_status ?? item.sale_status,
                  sale_date: updates.sale_date ?? item.sale_date,
                  sale_notes: updates.sale_notes ?? item.sale_notes,
                  sold_price: updates.sold_price ?? item.sold_price,
                }
              : item
          );
        });
      }

      return { previousInventory };
    },
    onError: (err, variables, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(INVENTORY_QUERY_KEY, context.previousInventory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });

  return {
    updateInventory: updateInventoryMutation.mutate,
    isUpdating: updateInventoryMutation.isPending,
  };
} 
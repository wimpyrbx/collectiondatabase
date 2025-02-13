import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { Inventory, NewInventory, UpdateInventory } from '@/types/inventory';
import { INVENTORY_QUERY_KEY } from './useInventoryCache';
import type { InventoryViewItem } from '@/types/inventory';

export const useInventoryTable = () => {
  const queryClient = useQueryClient();

  // Update mutation
  const updateInventoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: UpdateInventory }) => {
      // Remove fields that should not be updated directly
      const { id: _, created_at, ...validUpdates } = updates as any;

      const { data, error } = await supabase
        .from('inventory')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: INVENTORY_QUERY_KEY });

      // Snapshot the previous value
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
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInventory) {
        queryClient.setQueryData(INVENTORY_QUERY_KEY, context.previousInventory);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });

  // Create mutation
  const createInventoryMutation = useMutation({
    mutationFn: async (inventory: NewInventory) => {
      const { data, error } = await supabase
        .from('inventory')
        .insert(inventory)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newInventory) => {
      await queryClient.cancelQueries({ queryKey: INVENTORY_QUERY_KEY });

      const previousInventory = queryClient.getQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY);

      // Create an optimistic inventory view item
      const optimisticInventory: InventoryViewItem = {
        inventory_id: -1, // Temporary ID
        product_id: newInventory.product_id,
        purchase_id: newInventory.purchase_id,
        sale_id: newInventory.sale_id,
        inventory_status: newInventory.inventory_status,
        inventory_created_at: new Date().toISOString(),
        product_title: '', // Will be filled by the view
        product_variant: null,
        release_year: null,
        is_product_active: true,
        product_notes: null,
        product_created_at: new Date().toISOString(),
        product_updated_at: new Date().toISOString(),
        product_group_name: null,
        product_type_name: '',
        rating_name: null,
        region_name: null,
        override_price: newInventory.override_price,
        price_nok_fixed: null,
        price_new_nok_fixed: null,
        final_price: null,
        purchase_seller: newInventory.purchase_seller,
        purchase_origin: newInventory.purchase_origin,
        purchase_cost: newInventory.purchase_cost,
        purchase_date: newInventory.purchase_date,
        purchase_notes: newInventory.purchase_notes,
        sale_buyer: newInventory.sale_buyer,
        sale_status: newInventory.sale_status,
        sale_date: newInventory.sale_date,
        sale_notes: newInventory.sale_notes,
        sold_price: newInventory.sold_price
      };

      queryClient.setQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY, old => {
        return old ? [optimisticInventory, ...old] : [optimisticInventory];
      });

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

  // Delete mutation
  const deleteInventoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: INVENTORY_QUERY_KEY });

      const previousInventory = queryClient.getQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY);

      queryClient.setQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY, old => {
        return old ? old.filter(item => item.inventory_id !== id) : [];
      });

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
    createInventory: createInventoryMutation.mutate,
    deleteInventory: deleteInventoryMutation.mutate,
    isUpdating: updateInventoryMutation.isPending,
    isCreating: createInventoryMutation.isPending,
    isDeleting: deleteInventoryMutation.isPending,
  };
}; 
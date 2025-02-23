import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { NewInventory, UpdateInventory } from '@/types/inventory';
import { INVENTORY_QUERY_KEY } from '@/hooks/viewHooks';
import type { InventoryViewItem } from '@/types/inventory';
import { createMutationOptions } from '@/config/queryConfig';

interface MutationContext {
  previousInventory: InventoryViewItem[] | undefined;
}

export const useInventoryTable = () => {
  const queryClient = useQueryClient();

  // Update mutation
  const updateInventoryMutation = useMutation(
    createMutationOptions<InventoryViewItem, unknown, { id: number; updates: UpdateInventory }, MutationContext>({
      mutationFn: async ({ id, updates }) => {
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

        if (previousInventory) {
          queryClient.setQueryData<InventoryViewItem[]>(INVENTORY_QUERY_KEY, old => {
            if (!old) return [];
            return old.map(item => 
              item.inventory_id === id 
                ? { ...item, ...updates }
                : item
            );
          });
        }

        return { previousInventory };
      },
      onError: (error: unknown, _variables: unknown, context: { previousInventory: InventoryViewItem[] } | undefined) => {
        console.error('Error updating inventory:', error);
        if (context?.previousInventory) {
          queryClient.setQueryData(INVENTORY_QUERY_KEY, context.previousInventory);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      },
    })
  );

  // Create mutation
  const createInventoryMutation = useMutation(
    createMutationOptions<InventoryViewItem, unknown, NewInventory, MutationContext>({
      mutationFn: async (inventory) => {
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

        const optimisticInventory: InventoryViewItem = {
          inventory_id: -1,
          product_id: newInventory.product_id,
          purchase_id: newInventory.purchase_id,
          sale_id: newInventory.sale_id,
          inventory_status: newInventory.inventory_status,
          inventory_created_at: new Date().toISOString(),
          product_title: '',
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
      onError: (error: unknown, _variables: unknown, context: { previousInventory: InventoryViewItem[] } | undefined) => {
        console.error('Error creating inventory:', error);
        if (context?.previousInventory) {
          queryClient.setQueryData(INVENTORY_QUERY_KEY, context.previousInventory);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      },
    })
  );

  // Delete mutation
  const deleteInventoryMutation = useMutation(
    createMutationOptions<void, unknown, number, MutationContext>({
      mutationFn: async (id) => {
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
      onError: (error: unknown, _variables: unknown, context: { previousInventory: InventoryViewItem[] } | undefined) => {
        console.error('Error deleting inventory:', error);
        if (context?.previousInventory) {
          queryClient.setQueryData(INVENTORY_QUERY_KEY, context.previousInventory);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      },
    })
  );

  return {
    updateInventory: updateInventoryMutation.mutate,
    createInventory: createInventoryMutation.mutate,
    deleteInventory: deleteInventoryMutation.mutate,
    isUpdating: updateInventoryMutation.isPending,
    isCreating: createInventoryMutation.isPending,
    isDeleting: deleteInventoryMutation.isPending,
  };
}; 
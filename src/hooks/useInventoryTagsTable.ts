import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { InventoryTag } from '@/types/tags';
import { INVENTORY_TAGS_QUERY_KEY } from './useInventoryTagsCache';

export const useInventoryTagsTable = () => {
  const queryClient = useQueryClient();

  // Create mutation
  const createInventoryTagMutation = useMutation({
    mutationFn: async (newTag: Omit<InventoryTag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('inventory_tags')
        .insert(newTag)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_TAGS_QUERY_KEY });
    }
  });

  // Update mutation
  const updateInventoryTagMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Omit<InventoryTag, 'id' | 'created_at'>> }) => {
      const { data, error } = await supabase
        .from('inventory_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_TAGS_QUERY_KEY });
    }
  });

  // Delete mutation
  const deleteInventoryTagMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('inventory_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_TAGS_QUERY_KEY });
    }
  });

  return {
    createInventoryTag: createInventoryTagMutation.mutate,
    updateInventoryTag: updateInventoryTagMutation.mutate,
    deleteInventoryTag: deleteInventoryTagMutation.mutate,
    isCreating: createInventoryTagMutation.isPending,
    isUpdating: updateInventoryTagMutation.isPending,
    isDeleting: deleteInventoryTagMutation.isPending
  };
}; 
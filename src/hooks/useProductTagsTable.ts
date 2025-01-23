import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { ProductTag } from '@/types/tags';
import { PRODUCT_TAGS_QUERY_KEY } from './useProductTagsCache';

export const useProductTagsTable = () => {
  const queryClient = useQueryClient();

  // Create mutation
  const createProductTagMutation = useMutation({
    mutationFn: async (newTag: Omit<ProductTag, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('products_tags')
        .insert(newTag)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_TAGS_QUERY_KEY });
    }
  });

  // Update mutation
  const updateProductTagMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Omit<ProductTag, 'id' | 'created_at'>> }) => {
      const { data, error } = await supabase
        .from('products_tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_TAGS_QUERY_KEY });
    }
  });

  // Delete mutation
  const deleteProductTagMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('products_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_TAGS_QUERY_KEY });
    }
  });

  return {
    createProductTag: createProductTagMutation.mutate,
    updateProductTag: updateProductTagMutation.mutate,
    deleteProductTag: deleteProductTagMutation.mutate,
    isCreating: createProductTagMutation.isPending,
    isUpdating: updateProductTagMutation.isPending,
    isDeleting: deleteProductTagMutation.isPending
  };
}; 
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TAGS_QUERY_KEY } from './useTagsCache';

interface ProductTagRelationship {
  id: number;
  product_id: number;
  tag_id: number;
  tag_value: string | null;
  created_at: string;
}

export const useProductTagsRelationship = () => {
  const queryClient = useQueryClient();

  // Create relationship mutation
  const createRelationshipMutation = useMutation({
    mutationFn: async ({ 
      productId, 
      tagId,
      tagValue 
    }: { 
      productId: number; 
      tagId: number;
      tagValue?: string;
    }) => {
      const { data, error } = await supabase
        .from('products_tags_relationship')
        .insert({
          product_id: productId,
          tag_id: tagId,
          tag_value: tagValue || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
  });

  // Delete relationship mutation
  const deleteRelationshipMutation = useMutation({
    mutationFn: async ({ productId, tagId }: { productId: number; tagId: number }) => {
      const { error } = await supabase
        .from('products_tags_relationship')
        .delete()
        .match({
          product_id: productId,
          tag_id: tagId
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
  });

  // Update all relationships mutation
  const updateAllRelationshipsMutation = useMutation({
    mutationFn: async ({ 
      productId, 
      tagIds,
      tagValues = {}
    }: { 
      productId: number; 
      tagIds: number[];
      tagValues?: Record<number, string>;
    }) => {
      // First delete all existing relationships
      const { error: deleteError } = await supabase
        .from('products_tags_relationship')
        .delete()
        .eq('product_id', productId);

      if (deleteError) throw deleteError;

      // Then create new relationships for all selected tags
      if (tagIds.length > 0) {
        const { error: insertError } = await supabase
          .from('products_tags_relationship')
          .insert(
            tagIds.map(tagId => ({
              product_id: productId,
              tag_id: tagId,
              tag_value: tagValues[tagId] || null
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY });
    }
  });

  return {
    createRelationship: createRelationshipMutation.mutate,
    deleteRelationship: deleteRelationshipMutation.mutate,
    isCreating: createRelationshipMutation.isPending,
    isDeleting: deleteRelationshipMutation.isPending,
    updateAllRelationships: updateAllRelationshipsMutation.mutate,
    isUpdating: updateAllRelationshipsMutation.isPending
  };
}; 
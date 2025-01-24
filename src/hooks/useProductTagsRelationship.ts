import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TAGS_QUERY_KEY } from './useTagsCache';

interface ProductTagRelationship {
  id: number;
  product_id: number;
  tag_id: number;
  created_at: string;
}

export const useProductTagsRelationship = () => {
  const queryClient = useQueryClient();

  // Create relationship mutation
  const createRelationshipMutation = useMutation({
    mutationFn: async ({ productId, tagId }: { productId: number; tagId: number }) => {
      const { data, error } = await supabase
        .from('products_tags_relationship')
        .insert({
          product_id: productId,
          tag_id: tagId
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

  return {
    createRelationship: createRelationshipMutation.mutate,
    deleteRelationship: deleteRelationshipMutation.mutate,
    isCreating: createRelationshipMutation.isPending,
    isDeleting: deleteRelationshipMutation.isPending
  };
}; 
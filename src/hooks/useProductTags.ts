import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { createMutationOptions } from '@/config/queryConfig';
import { PRODUCT_MUTATION_KEYS } from '@/config/mutationKeys';
import type { ProductViewItem } from '@/types/product';
import type { TagWithRelationships } from '@/types/tags';
import { useRef } from 'react';

interface MutationContext {
  previousProducts: ProductViewItem[] | undefined;
}

export const useProductTags = () => {
  const queryClient = useQueryClient();
  const PRODUCTS_QUERY_KEY = ['products'];

  // Store context in a ref to access it in error handler
  const addTagContext = useRef<MutationContext>();
  const removeTagContext = useRef<MutationContext>();

  // Add tag mutation
  const addTagMutation = useMutation(
    createMutationOptions<void, unknown, { productId: number; tagId: number }, MutationContext>({
      mutationKey: PRODUCT_MUTATION_KEYS.addTag,
      mutationFn: async ({ productId, tagId }) => {
        const { data, error } = await supabase.rpc('add_product_tag', { 
          p_product_id: productId, 
          p_tag_id: tagId 
        });
        if (error) throw error;
      },
      onMutate: async ({ productId, tagId }) => {
        // Optimistically update the cache
        await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });
        const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);
        const productTags = queryClient.getQueryData<TagWithRelationships[]>(['product_tags']) || [];
        const tag = productTags.find(t => t.id === tagId);

        if (previousProducts) {
          queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
            if (!old) return old;
            return old.map(item => {
              if (item.product_id === productId && tag) {
                const existingTags = item.tags || [];
                return {
                  ...item,
                  tags: [...existingTags, tag],
                  products_updated_at: new Date().toISOString(),
                  products_updated_secondsago: 0
                };
              }
              return item;
            });
          });
        }

        const context = { previousProducts };
        addTagContext.current = context;
        return context;
      },
      onError: (error: unknown) => {
        if (addTagContext.current?.previousProducts) {
          queryClient.setQueryData(PRODUCTS_QUERY_KEY, addTagContext.current.previousProducts);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      },
      meta: { 
        silent: true,
        disableGlobalNotification: true
      }
    })
  );

  // Remove tag mutation
  const removeTagMutation = useMutation(
    createMutationOptions<void, unknown, { productId: number; tagId: number }, MutationContext>({
      mutationKey: PRODUCT_MUTATION_KEYS.removeTag,
      mutationFn: async ({ productId, tagId }) => {
        const { data, error } = await supabase.rpc('remove_product_tag', { 
          p_product_id: productId, 
          p_tag_id: tagId 
        });
        if (error) throw error;
      },
      onMutate: async ({ productId, tagId }) => {
        // Optimistically update the cache
        await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });
        const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);

        if (previousProducts) {
          queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
            if (!old) return old;
            return old.map(item => {
              if (item.product_id === productId) {
                return {
                  ...item,
                  tags: (item.tags || []).filter(t => t.id !== tagId),
                  products_updated_at: new Date().toISOString(),
                  products_updated_secondsago: 0
                };
              }
              return item;
            });
          });
        }

        const context = { previousProducts };
        removeTagContext.current = context;
        return context;
      },
      onError: (error: unknown) => {
        if (removeTagContext.current?.previousProducts) {
          queryClient.setQueryData(PRODUCTS_QUERY_KEY, removeTagContext.current.previousProducts);
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      },
      meta: { 
        silent: true,
        disableGlobalNotification: true
      }
    })
  );

  return {
    addTag: addTagMutation.mutateAsync,
    removeTag: removeTagMutation.mutateAsync,
    isAddingTag: addTagMutation.isPending,
    isRemovingTag: removeTagMutation.isPending,
    addTagError: addTagMutation.error,
    removeTagError: removeTagMutation.error
  };
}; 
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { Product, NewProduct } from '@/types/tables';
import { PRODUCTS_QUERY_KEY } from './useProductsCache';
import type { ProductViewItem } from '@/types/product';

export const useProductsTable = () => {
  const queryClient = useQueryClient();

  // Update mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: Partial<Product> }) => {
      // Remove fields that should not be updated directly
      const { id: _, created_at, updated_at, price_nok, price_nok_fixed, price_new_nok, price_new_nok_fixed, ...validUpdates } = updates;

      const { data, error } = await supabase
        .from('products')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);

      // Optimistically update the cache
      if (previousProducts) {
        queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
          if (!old) return [];
          return old.map(product => 
            product.product_id === id 
              ? {
                  ...product,
                  product_title: updates.product_title ?? product.product_title,
                  product_variant: updates.product_variant ?? product.product_variant,
                  release_year: updates.release_year ?? product.release_year,
                  is_product_active: updates.is_product_active ?? product.is_product_active,
                  product_notes: updates.product_notes ?? product.product_notes,
                  product_group_name: updates.product_group ?? product.product_group_name,
                  product_type_name: updates.product_type ?? product.product_type_name,
                  rating_name: updates.rating ?? product.rating_name,
                  region_name: updates.region ?? product.region_name,
                  price_usd: updates.price_usd ?? product.price_usd,
                  price_new_usd: updates.price_new_usd ?? product.price_new_usd,
                }
              : product
          );
        });
      }

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousProducts) {
        queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is in sync
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });

  // Create mutation
  const createProductMutation = useMutation({
    mutationFn: async (product: NewProduct) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newProduct) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });

      const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);

      // Create an optimistic product view item
      const optimisticProduct: ProductViewItem = {
        product_id: -1, // Temporary ID
        product_title: newProduct.product_title,
        product_variant: newProduct.product_variant ?? null,
        release_year: newProduct.release_year ?? null,
        is_product_active: newProduct.is_product_active ?? true,
        product_notes: newProduct.product_notes ?? null,
        product_created_at: new Date().toISOString(),
        product_updated_at: new Date().toISOString(),
        product_group_name: newProduct.product_group ?? null,
        product_type_name: newProduct.product_type,
        rating_name: newProduct.rating ?? null,
        region_name: newProduct.region ?? null,
        price_usd: newProduct.price_usd ?? null,
        price_nok: null,
        price_nok_fixed: null,
        price_new_usd: newProduct.price_new_usd ?? null,
        price_new_nok: null,
        price_new_nok_fixed: null,
        final_price: null,
        normal_count: 0,
        for_sale_count: 0,
        collection_count: 0,
        sold_count: 0,
        total_count: 0,
        total_sales: 0,
        unique_buyers: 0,
        avg_sale_price: null,
        max_sale_price: null,
        min_sale_price: null,
        pricecharting_id: newProduct.pricecharting_id ?? null,
      };

      queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
        return old ? [optimisticProduct, ...old] : [optimisticProduct];
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });

  // Delete mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });

      const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);

      queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
        return old ? old.filter(product => product.product_id !== id) : [];
      });

      return { previousProducts };
    },
    onError: (err, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
    },
  });

  return {
    updateProduct: updateProductMutation.mutate,
    createProduct: createProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isUpdating: updateProductMutation.isPending,
    isCreating: createProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
}; 
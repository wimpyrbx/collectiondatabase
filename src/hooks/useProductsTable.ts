import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { Product, NewProduct } from '@/types/tables';
import { PRODUCTS_QUERY_KEY } from '@/hooks/viewHooks';
import type { ProductViewItem } from '@/types/product';
import { createMutationOptions } from '@/config/queryConfig';

interface MutationContext {
  previousProducts: ProductViewItem[] | undefined;
}

export const useProductsTable = () => {
  const queryClient = useQueryClient();

  // Update mutation
  const updateProductMutation = useMutation(
    createMutationOptions<{data: Product}, unknown, { id: number; updates: Partial<Product> }, MutationContext>({
      mutationFn: async ({ id, updates }) => {
        // Create a clean update object that explicitly includes null values
        const updateData: Record<string, any> = {};
        
        // Explicitly set fields that should be updated, including null values
        Object.entries(updates).forEach(([key, value]) => {
          // Skip fields that should not be updated directly
          if (['id', 'created_at', 'updated_at', 'price_nok', 'price_nok_fixed', 'price_new_nok', 'price_new_nok_fixed'].includes(key)) {
            return;
          }
          // Explicitly include the value, even if it's null
          updateData[key] = value;
        });

        console.log('Updating product with ID:', id);
        console.log('Update data being sent to Supabase:', updateData);

        // Do the update
        const { data, error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }

        console.log('Update successful, received data:', data);
        return { data };
      },
      onMutate: async ({ id, updates }) => {
        await queryClient.cancelQueries({ queryKey: PRODUCTS_QUERY_KEY });
        const previousProducts = queryClient.getQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY);

        // Don't update cache here - wait for success
        return { previousProducts };
      },
      onSuccess: (result, variables) => {
        const { data } = result;
        queryClient.setQueryData<ProductViewItem[]>(PRODUCTS_QUERY_KEY, old => {
          if (!old) {
            return [];
          }
          
          const now = new Date();
          
          // Update all products' secondsAgo values
          const updatedProducts = old.map(product => {
            if (product.product_id === variables.id) {

              // This is the product being updated
              const updates: Partial<ProductViewItem> = {};
              Object.entries(variables.updates).forEach(([key, value]) => {
                // Skip fields that shouldn't be updated
                if (['id', 'created_at', 'updated_at', 'price_nok', 'price_nok_fixed', 'price_new_nok', 'price_new_nok_fixed'].includes(key)) {
                  return;
                }

                // Map database field names to view field names
                const viewField = key === 'product_group' ? 'product_group_name'
                  : key === 'product_type' ? 'product_type_name'
                  : key === 'rating' ? 'rating_name'
                  : key === 'region' ? 'region_name'
                  : key;

                (updates as any)[viewField] = data[key as keyof Product];
              });

              // Reset the update time fields
              const updatedProduct = {
                ...product,
                ...updates,
                products_updated_at: now.toISOString(),
                products_updated_secondsago: 0
              };

              return updatedProduct;
            }

            return product;
          });

          return updatedProducts;
        });
      },
      onError: (
        error: unknown,
        variables?: { id: number; updates: Partial<Product> },
        context?: MutationContext
      ) => {
        if (context?.previousProducts) {
          queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
        }
      }
    })
  );

  // Create mutation
  const createProductMutation = useMutation(
    createMutationOptions<Product, unknown, NewProduct, MutationContext>({
      mutationFn: async (product) => {
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

        const optimisticProduct: ProductViewItem = {
          product_id: -1,
          product_title: newProduct.product_title,
          product_variant: newProduct.product_variant ?? null,
          release_year: newProduct.release_year ?? null,
          is_product_active: newProduct.is_product_active ?? true,
          product_notes: newProduct.product_notes ?? null,
          product_created_at: new Date().toISOString(),
          products_updated_at: new Date().toISOString(),
          products_updated_secondsago: 0,
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
      onError: (
        error: unknown,
        variables?: NewProduct,
        context?: MutationContext
      ) => {
        if (context?.previousProducts) {
          queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
        }
      }
    })
  );

  // Delete mutation
  const deleteProductMutation = useMutation(
    createMutationOptions<void, unknown, number, MutationContext>({
      mutationFn: async (id) => {
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
      onError: (
        error: unknown,
        variables?: number,
        context?: MutationContext
      ) => {
        if (context?.previousProducts) {
          queryClient.setQueryData(PRODUCTS_QUERY_KEY, context.previousProducts);
        }
      }
    })
  );

  const handleUpdate = async (id: number, updates: Partial<Product>) => {
    // Remove computed fields that shouldn't be sent to the server
    const { id: _, created_at, updated_at, ...validUpdates } = updates;

    try {
      const { data, error } = await supabase
        .from('products')
        .update(validUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate the products cache to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      return { data, error: null };
    } catch (error) {
      console.error('Error updating product:', error);
      return { data: null, error: error as Error };
    }
  };

  const validateUpdates = (updates: Partial<Product>) => {
    const errors: string[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      // Skip validation for computed fields
      if (['id', 'created_at', 'updated_at'].includes(key)) {
        return;
      }

      // Add your validation rules here
      if (key === 'release_year' && value !== null) {
        const year = Number(value);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
          errors.push('Invalid release year');
        }
      }
    });

    return errors;
  };

  const handleCreate = async (newProduct: ProductCreateDTO) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          product_title: newProduct.product_title,
          product_variant: newProduct.product_variant ?? null,
          release_year: newProduct.release_year ? Number(newProduct.release_year) : null,
          is_product_active: newProduct.is_product_active ?? true,
          product_notes: newProduct.product_notes ?? null,
          product_group: newProduct.product_group ?? null,
          product_type: newProduct.product_type,
          rating: newProduct.rating ?? null,
          region: newProduct.region ?? null,
          publisher: newProduct.publisher ?? null,
          developer: newProduct.developer ?? null,
          genre: newProduct.genre ?? null,
          ean_gtin: newProduct.ean_gtin ?? null,
          asin: newProduct.asin ?? null,
          epid: newProduct.epid ?? null,
          pricecharting_id: newProduct.pricecharting_id ?? null
        })
        .select()
        .single();

      if (error) throw error;

      // Invalidate the products cache to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ['products'] });

      return { data, error: null };
    } catch (error) {
      console.error('Error creating product:', error);
      return { data: null, error: error as Error };
    }
  };

  return {
    updateProduct: updateProductMutation.mutate,
    createProduct: createProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isUpdating: updateProductMutation.isPending,
    isCreating: createProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
}; 
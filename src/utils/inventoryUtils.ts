import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { ProductViewItem } from '@/types/product';
import { trackLocalChange, shouldInvalidateCache } from './tableChangesUtils';

interface InventoryItem {
  id: number;
  product_id: number;
  inventory_status: string;
  created_at: string;
  inventory_updated_at: string;
  purchase_id?: number;
  sale_id?: number;
  override_price?: number;
}

export const updateInventoryCache = async (productId: number, queryClient: ReturnType<typeof useQueryClient>) => {
  try {
    // Insert new inventory item
    const { data: newInventory, error } = await supabase
      .from('inventory')
      .insert([
        { 
          product_id: productId,
          inventory_status: 'Normal'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Track that we made this change
    trackLocalChange('inventory');
    trackLocalChange('products'); // Since we're updating product counts too

    // Query the view_inventory to get the complete data for the new item
    const { data: completeInventory, error: viewError } = await supabase
      .from('view_inventory')
      .select('*')
      .eq('inventory_id', newInventory.id)
      .single();

    if (viewError) throw viewError;

    console.log('Complete inventory data from view:', completeInventory);

    // Update cache with the complete data
    queryClient.setQueryData<InventoryItem[]>(['inventory'], (old = []) => {
      // Ensure we don't lose any existing items
      const existingItems = old.filter(item => item.id !== completeInventory.inventory_id);
      const updatedInventory = [completeInventory, ...existingItems];
      console.log('Updated inventory cache with new data:', updatedInventory);
      return updatedInventory;
    });

    // Optimistically update products cache
    queryClient.setQueryData<ProductViewItem[]>(['products'], (old = []) => {
      const updatedProducts = old.map(product => {
        if (product.product_id === productId) {
          const updatedProduct = {
            ...product,
            total_count: (product.total_count || 0) + 1,
            normal_count: (product.normal_count || 0) + 1,
            products_updated_at: new Date().toISOString()
          };
          console.log('Updated product in cache:', updatedProduct);
          return updatedProduct;
        }
        return product;
      });
      return updatedProducts;
    });

    // Only invalidate if there have been external changes
    const shouldInvalidate = await shouldInvalidateCache(['inventory', 'products']);
    if (shouldInvalidate) {
      console.log('External changes detected, invalidating queries...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] })
      ]);
    } else {
      console.log('No external changes, keeping current cache...');
    }

  } catch (error) {
    console.error('Failed to add to inventory:', error);
    // On error, we should still check for external changes
    const shouldInvalidate = await shouldInvalidateCache(['inventory', 'products']);
    if (shouldInvalidate) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] })
      ]);
    }
  }
};
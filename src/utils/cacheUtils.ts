export const updateInventoryCounts = (
  queryClient: QueryClient, 
  productId: number
) => {
  queryClient.setQueryData<InventoryViewItem[]>(['inventory'], (oldData) => {
    if (!oldData) return oldData;
    
    // Get all items with this product_id
    const sameProductItems = oldData.filter(i => i.product_id === productId);
    const total = sameProductItems.length;
    
    // If no items left, no need to update
    if (total === 0) return oldData;
    
    // Calculate counts
    const normal = sameProductItems.filter(i => i.inventory_status === 'Normal').length;
    const collection = sameProductItems.filter(i => i.inventory_status === 'Collection').length;
    const forSale = sameProductItems.filter(i => i.inventory_status === 'For Sale').length;
    const sold = sameProductItems.filter(i => i.inventory_status === 'Sold').length;
    
    // Update all items with this product_id
    return oldData.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          total_count: total,
          normal_count: normal,
          collection_count: collection,
          for_sale_count: forSale,
          sold_count: sold
        };
      }
      return item;
    });
  });
};
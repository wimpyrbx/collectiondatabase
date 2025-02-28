import { TagWithRelationships } from '@/types/tags';
import { InventoryViewItem } from '@/types/inventory';
import { PriceType, ProductViewItem } from '@/types/product';

/**
 * SQL VIEW IMPLEMENTATION GUIDANCE
 * 
 * The final_price calculation in the view_inventory SQL view should follow this logic:
 * 
 * ```sql
 * -- Example SQL logic for calculating final_price in the view
 * CASE
 *   -- 1. If override_price is set, use that
 *   WHEN i.override_price IS NOT NULL THEN i.override_price
 *   
 *   -- 2. If the item is sold, use the sold_price 
 *   WHEN i.inventory_status = 'Sold' AND si.sale_price IS NOT NULL THEN si.sale_price
 *   
 *   -- 3. If item has New/Sealed tag, use the "new" price
 *   WHEN EXISTS (
 *     SELECT 1 FROM inventory_tags it 
 *     JOIN tags t ON it.tag_id = t.id 
 *     WHERE it.inventory_id = i.id AND t.name = 'New/Sealed'
 *   ) OR EXISTS (
 *     SELECT 1 FROM product_tags pt 
 *     JOIN tags t ON pt.tag_id = t.id 
 *     WHERE pt.product_id = i.product_id AND t.name = 'New/Sealed'
 *   ) THEN pp_new.nok_fixed
 *   
 *   -- 4. Default to "complete" price
 *   ELSE pp_complete.nok_fixed
 * END AS final_price
 * ```
 * 
 * Where:
 * - i = inventory table
 * - si = sale_items table
 * - pp_new = product_prices table filtered to price_type='new'
 * - pp_complete = product_prices table filtered to price_type='complete'
 * 
 * IMPORTANT: The SQL should never fall back to a different price type if the determined
 * price type is not available. If a price type is missing, the result should be NULL.
 */

/**
 * Checks if an inventory item has a specific tag by name
 */
export const hasTag = (item: InventoryViewItem, tagName: string): boolean => {
  // Check both inventory tags and product tags
  const allTags = [
    ...(item.tags || []),
    ...(item.product_tags || [])
  ];
  
  return allTags.some(tag => 
    tag.name.toLowerCase() === tagName.toLowerCase()
  );
};

/**
 * Determines the correct price type to use for an inventory item
 * based on its tags (e.g., "new" for New/Sealed items)
 */
export const getPriceType = (item: InventoryViewItem): PriceType => {
  // If the item has the "New/Sealed" tag, use the "new" price type
  if (hasTag(item, 'New/Sealed')) {
    return 'new';
  }
  
  // Default to "complete" price type
  return 'complete';
};

/**
 * Gets the fixed NOK price for a given price type from the prices object.
 * Returns null if the price type is not available - NO FALLBACKS.
 */
export const getPriceByType = (item: InventoryViewItem, priceType: PriceType): number | null => {
  if (!item.prices || !item.prices[priceType]) {
    return null;
  }
  
  return item.prices[priceType]?.nok_fixed || null;
};

/**
 * Gets the final price for an inventory item following the priority:
 * 1. Override price (if set)
 * 2. Sale price (if sold)
 * 3. Price based on type determined by tags (STRICT - no fallbacks)
 * 
 * If the determined price type doesn't have a price, returns null.
 */
export const getFinalPrice = (item: InventoryViewItem): number | null => {
  // 1. If override_price is set, use that
  if (item.override_price !== null && item.override_price !== undefined) {
    return item.override_price;
  }
  
  // 2. If the item is sold, use the sold_price
  if (item.inventory_status === 'Sold' && item.sold_price !== null && item.sold_price !== undefined) {
    return item.sold_price;
  }
  
  // 3. Determine which price to use based on tags
  const priceType = getPriceType(item);
  
  // Return the price for the determined type (null if not available)
  // NEVER fall back to another price type
  return getPriceByType(item, priceType);
};

/**
 * Gets appropriate price display text, including fallback handling
 */
export const getPriceDisplayText = (item: InventoryViewItem): string => {
  const price = getFinalPrice(item);
  
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  return `NOK ${price.toFixed(0)},-`;
};

/**
 * For debugging: Get a string explaining which price source is being used
 */
export const getPriceSourceExplanation = (item: InventoryViewItem): string => {
  if (item.override_price !== null && item.override_price !== undefined) {
    return 'Override price';
  }
  
  if (item.inventory_status === 'Sold' && item.sold_price !== null && item.sold_price !== undefined) {
    return 'Sold price';
  }
  
  const priceType = getPriceType(item);
  const price = getPriceByType(item, priceType);
  
  if (price === null) {
    return `No ${priceType} price available`;
  }
  
  return `Product ${priceType} price`;
};

/**
 * Gets the fixed NOK price for a product's default price type (complete)
 * without any fallbacks.
 */
export const getProductDefaultPrice = (product: ProductViewItem): number | null => {
  if (!product.prices || !product.prices['complete']) {
    return null;
  }
  
  return product.prices['complete']?.nok_fixed || null;
};

/**
 * Gets appropriate price display text for a product
 */
export const getProductPriceDisplayText = (product: ProductViewItem): string => {
  const price = product.final_price || getProductDefaultPrice(product);
  
  if (price === null || price === undefined) {
    return 'N/A';
  }
  
  return `NOK ${price.toFixed(0)},-`;
}; 
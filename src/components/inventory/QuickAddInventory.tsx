import React from 'react';
import { FaBoxOpen, FaPlus } from 'react-icons/fa';
import type { ProductViewItem } from '@/types/product';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import regionsData from '@/data/regions.json';
import clsx from 'clsx';

interface QuickAddInventoryProps {
  products: ProductViewItem[];
  onSuccess?: (inventoryId: number) => void;
}

export const QuickAddInventory: React.FC<QuickAddInventoryProps> = ({
  products,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isAdding, setIsAdding] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  const { createInventory } = useInventoryTable();

  // Filter products based on search term
  const filteredProducts = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return products
      .filter(product => 
        product.product_title.toLowerCase().includes(term) ||
        product.product_variant?.toLowerCase().includes(term) ||
        product.product_type_name.toLowerCase().includes(term) ||
        product.product_group_name?.toLowerCase().includes(term)
      )
      .slice(0, 10); // Limit to 10 results
  }, [products, searchTerm]);

  // Handle adding inventory item
  const handleAdd = async (product: ProductViewItem) => {
    setIsAdding(true);
    setErrors([]);

    try {
      const newInventory = {
        product_id: product.product_id,
        inventory_status: 'NORMAL',
        purchase_id: null,
        sale_id: null,
        override_price: null,
        purchase_seller: null,
        purchase_origin: null,
        purchase_cost: null,
        purchase_date: null,
        purchase_notes: null,
        sale_buyer: null,
        sale_status: null,
        sale_date: null,
        sale_notes: null,
        sold_price: null
      };

      await createInventory(newInventory);
      
      // Clear search and notify parent
      setSearchTerm('');
      onSuccess?.(product.product_id);
    } catch (error) {
      setErrors(['Failed to add inventory item']);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <input
        ref={searchInputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search to add product..."
        className={clsx(
          'w-[300px] px-3 py-2 bg-gray-900 text-gray-300 rounded-lg',
          'border border-gray-700 focus:border-blue-500',
          'placeholder-gray-500',
          'transition-colors duration-200'
        )}
      />

      {/* Results Dropdown */}
      {filteredProducts.length > 0 && (
        <div className={clsx(
          'fixed mt-2',
          'bg-gray-800 rounded-lg',
          'border border-gray-700',
          'shadow-lg shadow-black/50',
          'max-h-[80vh] overflow-y-auto',
          'z-[9999]',
          'w-[400px]'
        )}
        style={{
          top: searchInputRef.current?.getBoundingClientRect().bottom ?? 0,
          right: window.innerWidth - (searchInputRef.current?.getBoundingClientRect().right ?? 0)
        }}
        >
          {filteredProducts.map((product) => (
            <div
              key={product.product_id}
              onClick={() => !isAdding && handleAdd(product)}
              className={clsx(
                'py-1.5 px-2 cursor-pointer',
                'transition-colors duration-150',
                'hover:bg-gray-700/50',
                'border-b border-gray-700/50 last:border-b-0',
                isAdding && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="flex gap-2 items-center min-h-[56px]">
                {/* Product Image */}
                <div className="w-[36px] shrink-0">
                  <div className="aspect-[3/4] bg-gray-700/50 rounded-lg overflow-hidden flex items-center justify-center">
                    <ImageDisplay
                      type="product"
                      id={product.product_id}
                      title={product.product_title}
                      className="w-full h-full object-contain"
                      placeholderClassName="w-4 h-4 text-gray-500"
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-200 text-xs leading-tight">
                        {product.product_title}
                        {product.product_variant && (
                          <span className="text-gray-400 ml-1">({product.product_variant})</span>
                        )}
                      </h3>
                      <div className="text-[9px] text-gray-400">
                        {[
                          product.product_type_name,
                          product.product_group_name,
                          product.release_year,
                          product.region_name
                        ].filter(Boolean).join(' • ')}
                      </div>
                    </div>

                    {/* Rating Image */}
                    {product.rating_name && product.region_name && (
                      <div className="w-[20px] aspect-square shrink-0 bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center p-0.5">
                        {(() => {
                          const ratingInfo = getRatingDisplayInfo(product.region_name, product.rating_name, regionsData.regions);
                          return ratingInfo.imagePath ? (
                            <img 
                              src={ratingInfo.imagePath} 
                              alt={ratingInfo.displayName} 
                              className="max-w-full max-h-full object-contain" 
                            />
                          ) : (
                            <span className="text-gray-600 text-[8px]">No Rating</span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Price Info */}
                  <div className="text-[9px] flex items-center gap-2">
                    <div>
                      <span className="text-gray-400">CIB:</span>
                      <span className="text-gray-200 ml-1">
                        {product.price_nok_fixed ? `NOK ${product.price_nok_fixed},-` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">New:</span>
                      <span className="text-gray-200 ml-1">
                        {product.price_new_nok_fixed ? `NOK ${product.price_new_nok_fixed},-` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Inventory Count */}
                  {(product.normal_count > 0 || product.collection_count > 0 || product.for_sale_count > 0) && (
                    <div className="text-[9px] text-orange-400">
                      Already in inventory!
                      {product.for_sale_count > 0 && ` (${product.for_sale_count} for sale)`}
                      {product.normal_count > 0 && ` (${product.normal_count} normal)`}
                      {product.collection_count > 0 && ` (${product.collection_count} collection)`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="absolute top-full left-0 mt-2 text-red-400 text-sm">
          {errors.join(', ')}
        </div>
      )}
    </div>
  );
};

export default QuickAddInventory; 
import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { Button } from '@/components/ui';
import { FaBoxOpen, FaTimes, FaCheck } from 'react-icons/fa';
import type { ProductViewItem } from '@/types/product';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import SearchResultList, { type SearchOption } from '@/components/formelement/SearchResultList';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import regionsData from '@/data/regions.json';
import clsx from 'clsx';

interface AddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductViewItem[];
  onSuccess?: (inventoryId: number) => void;
}

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  onSuccess
}) => {
  const [selectedProduct, setSelectedProduct] = React.useState<ProductViewItem | null>(null);
  const [closeAfterAdd, setCloseAfterAdd] = React.useState(true);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isAdding, setIsAdding] = React.useState(false);
  
  const { createInventory } = useInventoryTable();

  // Create a ref for the search input
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setErrors([]);
      setIsAdding(false);
    }
  }, [isOpen]);

  // Convert products to search options
  const searchOptions: SearchOption[] = React.useMemo(() => 
    products.map(product => ({
      value: String(product.product_id),
      label: product.product_title + (product.product_variant ? ` (${product.product_variant})` : ''),
      description: [
        product.product_type_name,
        product.product_group_name,
        product.release_year,
        product.region_name
      ].filter(Boolean).join(' • ')
    })),
    [products]
  );

  // Focus search box when modal opens
  React.useEffect(() => {
    if (isOpen) {
      // Longer delay to ensure modal is fully rendered and mounted
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle product selection
  const handleProductSelect = (option: SearchOption | null) => {
    const product = option 
      ? products.find(p => p.product_id === Number(option.value))
      : null;
    setSelectedProduct(product || null);
    setErrors([]);
  };

  // Handle add button click
  const handleAdd = async () => {
    if (!selectedProduct) return;
    
    setIsAdding(true);
    setErrors([]);

    try {
      const newInventory = {
        product_id: selectedProduct.product_id,
        inventory_status: 'Normal',
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
      
      if (closeAfterAdd) {
        onClose();
      } else {
        setSelectedProduct(null);
        searchInputRef.current?.focus();
      }
      
      // Notify parent of success
      onSuccess?.(selectedProduct.product_id);
    } catch (error) {
      setErrors(['Failed to add inventory item']);
    } finally {
      setIsAdding(false);
    }
  };

  // Handle key press in modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedProduct && !isAdding) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Card modal>
        <div onKeyDown={handleKeyDown}>
          <Card.Header
            title="Add Product To Inventory"
            icon={<FaBoxOpen />}
            iconColor="text-cyan-500"
            bgColor="bg-cyan-500/50"
          />
          <Card.Body>
            <div className="space-y-4">
              {/* Product Search */}
              <div className="relative">
                <SearchResultList
                  ref={searchInputRef}
                  options={searchOptions}
                  selectedOption={selectedProduct ? {
                    value: String(selectedProduct.product_id),
                    label: selectedProduct.product_title + (selectedProduct.product_variant ? ` (${selectedProduct.product_variant})` : ''),
                    description: [
                      selectedProduct.product_type_name,
                      selectedProduct.product_group_name,
                      selectedProduct.release_year,
                      selectedProduct.region_name
                    ].filter(Boolean).join(' • ')
                  } : null}
                  onSelect={handleProductSelect}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for a product..."
                  maxResults={10}
                  className="[&_div[role='listbox']]:!fixed [&_div[role='listbox']]:!z-[9999]"
                />
              </div>

              {/* Product Info Section */}
              <div className={clsx(
                'bg-gray-900/50 rounded-lg p-4 transition-all duration-200',
                !selectedProduct && 'opacity-25'
              )}>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  {/* Image Column */}
                  <div>
                    <div className="w-full aspect-[3/4] bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center">
                      {selectedProduct ? (
                        <ImageDisplay
                          type="product"
                          id={selectedProduct.product_id}
                          title={selectedProduct.product_title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FaBoxOpen className="w-8 h-8 text-gray-700" />
                      )}
                    </div>
                    {/* Rating Image */}
                    {selectedProduct?.rating_name && selectedProduct?.region_name && (
                      <div className="mt-2 w-full aspect-square bg-gray-800/50 rounded-lg overflow-hidden flex items-center justify-center p-1">
                        {(() => {
                          const ratingInfo = getRatingDisplayInfo(selectedProduct.region_name, selectedProduct.rating_name, regionsData.regions);
                          return ratingInfo.imagePath ? (
                            <img 
                              src={ratingInfo.imagePath} 
                              alt={ratingInfo.displayName} 
                              className="max-w-full max-h-full object-contain" 
                            />
                          ) : (
                            <span className="text-gray-600 text-xs">No Rating</span>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Info Column */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-lg text-gray-200 flex items-center gap-2">
                      {selectedProduct?.product_title || 'No Product Selected'}
                      {selectedProduct?.product_variant && (
                        <span className="text-gray-400 text-sm">({selectedProduct.product_variant})</span>
                      )}
                    </h3>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Type:</span>
                        <span className="text-gray-200 ml-2">{selectedProduct?.product_type_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Group:</span>
                        <span className="text-gray-200 ml-2">{selectedProduct?.product_group_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Region:</span>
                        <span className="text-gray-200 ml-2">{selectedProduct?.region_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Year:</span>
                        <span className="text-gray-200 ml-2">{selectedProduct?.release_year || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Price:</span>
                        <span className="text-gray-200 ml-2">
                          {selectedProduct?.prices?.loose?.nok_fixed 
                            ? `NOK ${selectedProduct.prices.loose.nok_fixed},-` 
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Button
                  onClick={onClose}
                  bgColor="bg-orange-600"
                  iconLeft={<FaTimes />}
                  type="button"
                  className="w-32"
                >
                  Cancel
                </Button>

                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closeAfterAdd}
                    onChange={(e) => setCloseAfterAdd(e.target.checked)}
                    className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
                  />
                  Close after adding
                </label>

                <Button
                  onClick={handleAdd}
                  bgColor="bg-green-900"
                  iconLeft={<FaCheck />}
                  type="submit"
                  className="w-32"
                  disabled={!selectedProduct || isAdding}
                >
                  Add
                </Button>
              </div>

              {errors.length > 0 && (
                <div className="text-red-400 text-sm text-center">
                  {errors.join(', ')}
                </div>
              )}
            </div>
          </Card.Footer>
        </div>
      </Card>
    </Modal>
  );
};

export default AddInventoryModal; 
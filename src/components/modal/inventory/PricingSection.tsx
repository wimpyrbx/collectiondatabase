import React, { useCallback } from 'react';
import clsx from 'clsx';
import { FaDollarSign } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { debounce } from 'lodash';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/utils/notifications';

interface PricingSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isConnectedToSale: boolean;
  handleInputChange: (key: string, value: any) => void;
  updateInventory: (params: { id: number; updates: any }) => Promise<any> | void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  inventory,
  formData,
  isConnectedToSale,
  handleInputChange,
  updateInventory
}) => {
  const queryClient = useQueryClient();
  
  // Add debounced update for override price
  const debouncedUpdateOverridePrice = useCallback(
    debounce(async (newPrice: string) => {
      if (!inventory) return;
      
      try {
        await updateInventory({
          id: inventory.inventory_id,
          updates: { override_price: newPrice ? Number(newPrice) : null }
        });

        notify(
          newPrice ? 'success' : 'warning',
          newPrice 
            ? `${inventory.product_title} price set to NOK ${newPrice}`
            : `${inventory.product_title} price cleared`,
          {
            duration: 1500
          }
        );
      } catch (error) {
        notify('error', `Failed to update ${inventory.product_title} price`);
      }
    }, 500),
    [inventory, updateInventory]
  );

  return (
    <div className="bg-gray-900/50 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaDollarSign className="text-green-400" />
          Pricing Information
        </h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Complete (CIB) Price */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3",
            !inventory?.tags?.some(t => t.id === 2) && "opacity-100",
            inventory?.tags?.some(t => t.id === 2) && "opacity-50"
          )}>
            <div className="text-xs text-gray-400 mb-1">CIB</div>
            <div className="text-sm text-gray-200">
              {inventory?.prices?.complete?.nok_fixed 
                ? `NOK ${Math.round(inventory.prices.complete.nok_fixed)},-` 
                : 'N/A'}
            </div>
          </div>

          {/* New/Sealed Price */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3",
            inventory?.tags?.some(t => t.id === 2) && "opacity-100",
            !inventory?.tags?.some(t => t.id === 2) && "opacity-50"
          )}>
            <div className="text-xs text-gray-400 mb-1">New</div>
            <div className="text-sm text-gray-200">
              {inventory?.prices?.new?.nok_fixed 
                ? `NOK ${Math.round(inventory.prices.new.nok_fixed)},-` 
                : 'N/A'}
            </div>
          </div>

          {/* Override Price Input */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3",
            isConnectedToSale && "opacity-50"
          )}>
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
              Override
            </div>
            <input
              type="text"
              className={clsx(
                "w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200",
                isConnectedToSale && "cursor-not-allowed"
              )}
              value={formData.override_price ? Math.round(Number(formData.override_price)).toString() : ''}
              onChange={(e) => {
                if (isConnectedToSale) return; // Prevent changes if connected to a sale
                
                const value = e.target.value;
                const numericValue = value ? Number(value) : null;
                
                // Update form data
                handleInputChange('override_price', value);
                
                // Update local inventory state to reflect changes immediately
                if (inventory) {
                  queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
                    if (!old) return old;
                    return old.map(item => {
                      if (item.inventory_id === inventory.inventory_id) {
                        return {
                          ...item,
                          override_price: numericValue,
                          final_price: numericValue || (item.tags?.some(t => t.id === 2) 
                            ? item.prices?.new?.nok_fixed 
                            : item.prices?.complete?.nok_fixed) || 0
                        };
                      }
                      return item;
                    });
                  });
                }
                
                // Debounce the actual API update
                if (inventory) {
                  debouncedUpdateOverridePrice(value);
                }
              }}
              disabled={isConnectedToSale}
            />
          </div>

          {/* Final Price Display */}
          <div className="bg-gray-800/30 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Final</div>
            <div className="text-sm text-gray-200">
              {(() => {
                const currentInventory = inventory && queryClient.getQueryData<InventoryViewItem[]>(['inventory'])?.find(i => i.inventory_id === inventory.inventory_id);
                return currentInventory?.final_price 
                  ? `NOK ${Math.round(currentInventory.final_price)},-` 
                  : 'N/A';
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingSection; 
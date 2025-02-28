import React, { useCallback, useState, useEffect } from 'react';
import clsx from 'clsx';
import { FaDollarSign, FaTag, FaInfoCircle } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { debounce } from 'lodash';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/utils/notifications';
import { getPriceType, getPriceByType, getFinalPrice, getPriceDisplayText, getPriceSourceExplanation, hasTag } from '@/utils/priceUtils';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TooltipStyle } from '@/utils/tooltip';
import { FormElement } from '@/components/formelement/FormElement';

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
  const infoButtonRef = React.useRef<HTMLDivElement>(null);
  const [showPriceInfo, setShowPriceInfo] = useState(false);
  
  // Get the most up-to-date inventory data from cache
  const cachedInventory = inventory ? 
    queryClient.getQueryData<InventoryViewItem[]>(['inventory'])?.find(
      item => item.inventory_id === inventory.inventory_id
    ) : null;
  
  // Use the cached data if available, otherwise fall back to the prop
  const effectiveInventory = cachedInventory || inventory;
  
  // Determine price type based on the most up-to-date inventory
  const priceType = effectiveInventory ? getPriceType(effectiveInventory) : 'complete';
  const isNewSealed = effectiveInventory ? hasTag(effectiveInventory, 'New/Sealed') : false;
  
  // Add this state to track the input value
  const [inputValue, setInputValue] = useState(
    formData.override_price ? Math.round(Number(formData.override_price)).toString() : ''
  );

  // Add this effect to reset the input value when inventory changes
  useEffect(() => {
    // Reset input value when inventory changes or formData.override_price changes
    setInputValue(formData.override_price ? Math.round(Number(formData.override_price)).toString() : '');
  }, [inventory?.inventory_id, formData.override_price]);

  // Create a combined debounced update function
  const debouncedFullUpdate = useCallback(
    debounce((value: string) => {
      const numericValue = value ? Number(value) : null;
      
      // Update form data
      handleInputChange('override_price', numericValue);
      
      // Update cache
      if (effectiveInventory) {
        queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
          if (!old) return old;
          return old.map(item => {
            if (item.inventory_id === effectiveInventory.inventory_id) {
              return {
                ...item,
                override_price: numericValue
              };
            }
            return item;
          });
        });
        
        // Make API call
        const result = updateInventory({
          id: effectiveInventory.inventory_id,
          updates: { override_price: numericValue }
        });

        // Check if result is a Promise before using .then()
        if (result instanceof Promise) {
          result.then(() => {
            notify(
              value ? 'success' : 'warning',
              value 
                ? `${effectiveInventory.product_title} price set to NOK ${value}`
                : `${effectiveInventory.product_title} price cleared`,
              { duration: 1500 }
            );
          }).catch(() => {
            notify('error', `Failed to update ${effectiveInventory.product_title} price`);
          });
        } else {
          // If not a Promise, show notification immediately
          notify(
            value ? 'success' : 'warning',
            value 
              ? `${effectiveInventory.product_title} price set to NOK ${value}`
              : `${effectiveInventory.product_title} price cleared`,
            { duration: 1500 }
          );
        }
      }
    }, 1000),
    [effectiveInventory, handleInputChange, queryClient, updateInventory]
  );

  return (
    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaDollarSign className="text-green-400" />
          Pricing Information
        </h3>
        <div 
          ref={infoButtonRef}
          className="cursor-help text-gray-500 hover:text-gray-300 transition-colors"
          onMouseEnter={() => setShowPriceInfo(true)}
          onMouseLeave={() => setShowPriceInfo(false)}
        >
          <FaInfoCircle />
          <Tooltip
            text={
              <div className="space-y-2 p-1">
                <div className="text-sm font-medium text-gray-200">Pricing Rules:</div>
                <div className="text-xs text-gray-300">
                  1. Override price (if set) takes highest priority
                </div>
                <div className="text-xs text-gray-300">
                  2. For sold items, sale price is used
                </div>
                <div className="text-xs text-gray-300">
                  3. Items with the "New/Sealed" tag use "new" price type
                </div>
                <div className="text-xs text-gray-300">
                  4. All other items use "complete" price type
                </div>
                <div className="text-xs text-gray-400 italic mt-2">
                  Note: If a price type doesn't have a price, "N/A" is shown
                </div>
              </div>
            }
            isOpen={showPriceInfo}
            elementRef={infoButtonRef}
            placement="top"
            style={TooltipStyle.frost}
          />
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Complete (CIB) Price */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3",
            priceType === 'complete' && !formData.override_price ? "ring-1 ring-green-500/50 bg-green-500/10" : "ring-1 ring-gray-500/50",
            priceType !== 'complete' && "opacity-75"
          )}>
            <div className="text-xs text-gray-400 mb-1">Complete/CIB</div>
            <div className="text-sm text-gray-200">
              {effectiveInventory?.prices?.complete?.nok_fixed 
                ? `NOK ${effectiveInventory.prices.complete.nok_fixed},-` 
                : 'N/A'}
            </div>
          </div>

          {/* New/Sealed Price */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3",
            priceType === 'new' && !formData.override_price ? "ring-1 ring-green-500/50 bg-green-500/10" : "ring-1 ring-gray-500/50",
            priceType !== 'new' && "opacity-75"
          )}>
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              New/Sealed
            </div>
            <div className="text-sm text-gray-200">
              {effectiveInventory?.prices?.new?.nok_fixed 
                ? `NOK ${effectiveInventory.prices.new.nok_fixed},-` 
                : 'N/A'}
            </div>
          </div>

          {/* Override Price Input */}
          <div className={clsx(
            "bg-gray-800/30 rounded-lg p-3 items-center justify-center",
            formData.override_price ? "ring-1 ring-green-500/50 bg-green-500/10" : "ring-1 ring-gray-500/50",
            isConnectedToSale && "opacity-50"
          )}>
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-2 justify-center">
              Override
            </div>
            <FormElement
              elementType="input"
              initialValue={inputValue}
              onValueChange={(value) => {
                if (isConnectedToSale) return;
                
                const newValue = typeof value === 'string' ? value : String(value);
                setInputValue(newValue); // Update local state immediately for responsive UI
                debouncedFullUpdate(newValue); // Debounce the actual updates
              }}
              placeholder="Enter price override"
              disabled={isConnectedToSale}
              numericOnly={true}
              bgColor="bg-gray-900/50"
              textSize="sm"
              padding="py-0.5 px-2"
              margin="m-0"
              className="w-full"
              disableTransitionOpacity={true}
            />
          </div>

          {/* Final Price Display */}
          <div className="bg-green-700/30 rounded-lg p-3 shadow-inner border border-green-300/50 flex flex-col justify-center h-full">
            <div className="text-xs text-gray-300 mb-1 font-medium text-center">Final Price</div>
            <div className="text-xs text-white text-center">
              {effectiveInventory ? getPriceDisplayText(effectiveInventory) : 'N/A'}
            </div>
          </div>
        </div>
        
        {/* Price explanation */}
        <div className="mt-5 flex items-center justify-center gap-1 text-md text-gray-400 bg-gray-900/30 rounded">
          {effectiveInventory && (
            <>
              {formData.override_price ? (
                priceType === 'new' ? (
                  <span>Price <span className="text-blue-400">new</span>, but using override price: <span className="text-green-400">NOK {formData.override_price},-</span></span>
                ) : (
                  <span>Price <span className="text-blue-400">complete</span>, but using override price: <span className="text-green-400">NOK {formData.override_price},-</span></span>
                )
              ) : effectiveInventory.inventory_status === 'Sold' && effectiveInventory.sold_price ? (
                <span>Using sold price from sale: <span className="text-blue-400">NOK {effectiveInventory.sold_price},-</span></span>
              ) : priceType === 'new' ? (
                <span>
                  Using <span className="text-blue-400">new</span> price type: {effectiveInventory.prices?.new?.nok_fixed 
                    ? <span className="text-blue-400">NOK {effectiveInventory.prices.new.nok_fixed},-</span> 
                    : <span className="text-red-400">No price available</span>}
                </span>
              ) : (
                <span>
                  Using <span className="text-blue-400">complete</span> price type: {effectiveInventory.prices?.complete?.nok_fixed 
                    ? <span className="text-blue-400">NOK {effectiveInventory.prices.complete.nok_fixed},-</span> 
                    : <span className="text-red-400">No price available</span>}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingSection; 
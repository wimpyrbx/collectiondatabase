import React, { useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import { INVENTORY_STATUSES } from '@/constants/inventory';
import { InventoryViewItem } from '@/types/inventory';
import { notify } from '@/utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { FaStore, FaArchive, FaShoppingCart, FaCheck, FaExclamationTriangle, FaBox, FaChevronDown } from 'react-icons/fa';
import { saleItemsConfig } from '@/hooks/viewHooks';
import { SupabaseClient } from '@supabase/supabase-js';

interface StatusButtonsProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isTransitionAllowed: (currentStatus: string, targetStatus: string, saleStatus: string | null) => boolean;
  handleInputChange: (key: string, value: any) => void;
  setIsConnectedToSale: (value: boolean) => void;
  isConnectedToSale: boolean;
  handleRemoveFromSale: () => Promise<void>;
  supabase: SupabaseClient;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  availableSales: any[];
}

const STATUS_OPTIONS = Object.values(INVENTORY_STATUSES);

const STATUS_ICONS = {
  store: FaStore,
  archive: FaArchive,
  cart: FaShoppingCart,
  check: FaCheck
};

export const StatusButtons: React.FC<StatusButtonsProps> = ({
  inventory,
  formData,
  isTransitionAllowed,
  handleInputChange,
  setErrors,
  setIsConnectedToSale,
  isConnectedToSale,
  handleRemoveFromSale,
  supabase,
  availableSales
}) => {
  const queryClient = useQueryClient();

  const getIcon = (iconType: keyof typeof STATUS_ICONS) => {
    const Icon = STATUS_ICONS[iconType];
    return <Icon />;
  };

  useEffect(() => {
    // Skip if no inventory
    if (!inventory) return;
    
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Skip if any modifier key is pressed
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
      
      // Only handle keyboard shortcuts when not in form elements
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      
      // Find option matching the pressed key
      const option = STATUS_OPTIONS.find(opt => opt.shortcut === e.key.toUpperCase());
      if (!option) return;
      
      e.preventDefault();
      
      // Check if trying to set the same status
      if (formData.inventory_status === option.value) {
        return;
      }
      
      // Special handling for For Sale button shortcut (F)
      const isForSaleOption = option.value === 'For Sale';
      
      // For the For Sale option, we need special handling:
      // - If connected to a sale with a valid sale_id, ALLOW the shortcut (to remove from sale)
      // - Otherwise, check if transition is allowed
      let isTransitionAllowedForOption = true;
      if (isForSaleOption && isConnectedToSale) {
        // If we have a sale_id, ALLOW the shortcut (to remove from sale)
        // Otherwise, disable it (can't set to For Sale when connected to a sale without a sale_id)
        isTransitionAllowedForOption = Boolean(formData.sale_id);
      } else {
        // For other options, use the normal transition rules
        isTransitionAllowedForOption = isTransitionAllowed(formData.inventory_status, option.value, null);
      }
      
      // Check if transition is allowed
      if (!isTransitionAllowedForOption) {
        return;
      }
      
      try {
        // Optimistically update UI
        handleInputChange('inventory_status', option.value);
        
        // Special case for "For Sale" status
        if (option.value === 'For Sale' && isConnectedToSale) {
          await handleRemoveFromSale();
          return;
        }
        
        // For other status changes
        const updates = {
          inventory_status: option.value
        };

        // Use supabase directly instead of updateInventory
        const { error } = await supabase
          .from('inventory')
          .update(updates)
          .eq('id', inventory.inventory_id);
          
        if (error) throw error;

        // Use the new function to update cache and invalidate queries
        updateCacheAndInvalidate(inventory.inventory_id, option.value);

        notify('success', `${inventory.product_title} status updated to ${option.value}`);
      } catch (error) {
        console.error('Error updating status:', error);
        setErrors(prev => [...prev, 'Failed to update status']);
        
        // Revert optimistic updates
        handleInputChange('sale_id', inventory.sale_id);
        handleInputChange('sale_status', inventory.sale_status);
        handleInputChange('inventory_status', inventory.inventory_status);
        
        // Revert connection state
        if (option.value !== 'For Sale') {
          setIsConnectedToSale(Boolean(inventory.sale_id));
        }
        
        queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
          if (!old) return old;
          return old.map(item => {
            if (item.inventory_id === inventory.inventory_id) {
              return {
                ...item,
                sale_id: inventory.sale_id,
                sale_status: inventory.sale_status,
                inventory_status: inventory.inventory_status,
                inventory_updated_at: inventory.inventory_updated_at
              };
            }
            return item;
          });
        });

        notify('error', `Failed to update ${inventory.product_title} status to ${option.value}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory, formData, isTransitionAllowed, isConnectedToSale, handleInputChange, supabase, handleRemoveFromSale, setErrors, queryClient]);

  // Add this function to update the cache and invalidate queries
  const updateCacheAndInvalidate = useCallback((inventoryId: number, newStatus: string) => {
    // Update the cache immediately to trigger UI updates
    queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
      if (!old) return old;
      return old.map(item => {
        if (item.inventory_id === inventoryId) {
          return {
            ...item,
            inventory_status: newStatus,
            inventory_updated_at: new Date().toISOString()
          };
        }
        return item;
      });
    });
    
    // Invalidate specific queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    
    // Also invalidate any related queries that might depend on inventory status
    queryClient.invalidateQueries({ queryKey: ['purchase_items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory_counts'] });
  }, [queryClient]);

  // Status button renderer
  const renderStatusButton = (option: typeof STATUS_OPTIONS[0]) => {
    const isActive = formData.inventory_status === option.value;
    
    // Fix the condition for disabling the For Sale button
    // The button should be disabled if:
    // 1. It's already active (current status is For Sale)
    // 2. The transition is not allowed
    // 3. For the For Sale button specifically, we need special handling:
    //    - If connected to a sale with a valid sale_id, ENABLE the button (to allow removing from sale)
    //    - Otherwise, follow normal transition rules
    const isForSaleButton = option.value === 'For Sale';
    
    let isDisabled = isActive || !isTransitionAllowed(formData.inventory_status, option.value, null);
    
    // Special handling for For Sale button
    if (isForSaleButton && isConnectedToSale) {
      // If we have a sale_id, ENABLE the button (to allow removing from sale)
      // Otherwise, disable it (can't set to For Sale when connected to a sale without a sale_id)
      isDisabled = !formData.sale_id;
    }
    
    const handleClick = async () => {
      // Check if trying to set the same status
      if (isActive) {
        return;
      }
      
      if (isDisabled) {
        return;
      }
      
      try {
        // Handle special case for "For Sale" status
        if (option.value === 'For Sale' && isConnectedToSale) {
          await handleRemoveFromSale();
          return;
        }
        
        // For other status changes
        handleInputChange('inventory_status', option.value);
        
        // Use supabase directly
        const { error } = await supabase
          .from('inventory')
          .update({ inventory_status: option.value })
          .eq('id', inventory!.inventory_id);
          
        if (error) throw error;
        
        // Use the new function to update cache and invalidate queries
        updateCacheAndInvalidate(inventory!.inventory_id, option.value);
        
        notify('success', `${inventory!.product_title} status updated to ${option.value}`);
      } catch (error) {
        console.error('Error updating status:', error);
        setErrors(prev => [...prev, 'Failed to update status']);
        
        // Revert optimistic update
        handleInputChange('inventory_status', inventory!.inventory_status);
        
        notify('error', `Failed to update ${inventory!.product_title} status to ${option.value}`);
      }
    };
    
    return (
      <Button
        key={option.value}
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
        className={clsx(
          'flex-1',
          'relative',
          'px-4 h-[53px]',
          isActive ? [
            option.styles.bgColor,
            '!bg-opacity-100',
            'ring-1',
            option.styles.borderColor,
            'shadow-lg',
            'shadow-black',
            'border-b-4 ' + option.styles.borderColor,
            option.styles.hoverBgColor,
          ] : [
            'bg-gray-800',
            'hover:bg-opacity-80',
            'transition-all duration-200',
            // Add hover background color if it exists
            option.styles.hoverBgColor,
            isDisabled && [
              'opacity-50',
              'cursor-not-allowed',
              'pointer-events-none'
            ]
          ]
        )}
      >
        <div className={clsx(
          "flex items-center justify-center gap-2"
        )}>
          <div className={clsx(
            isActive ? option.styles.textColor : "text-gray-400"
          )}>
            {getIcon(option.iconType)}
          </div>
          <div className={clsx(
            "font-medium whitespace-nowrap",
            isActive ? option.styles.textColor : "text-gray-300"
          )}>
            {option.label} ({option.shortcut})
          </div>
        </div>
      </Button>
    );
  };

  return (
    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          Pricing Information
        </h3>
      </div>
      <div className="p-0">
      <div className="flex gap-2 p-4 pb-0 bg-gray-900/20 rounded-lg overflow-hidden">
        {STATUS_OPTIONS.map(renderStatusButton)}
      </div>
      <div className="p-4 pt-3">
      {formData.inventory_status === 'Normal' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-sm text-gray-400">
          Item is in <span className="text-gray-300">Normal</span> status
        </div>
      )}
      {formData.inventory_status === 'Collection' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-sm text-orange-400">
          Item is in <span className="text-orange-300">Collection</span> status
        </div>
      )}
      {!formData.sale_id && formData.inventory_status === 'For Sale' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-sm text-green-400">
          {availableSales && availableSales.length > 0 ? (
            "You can now connect this item to a sale"
          ) : (
            <span className="text-yellow-400 flex items-center gap-2">
              You can now connect to sale, but no sales are available
            </span>
          )}
        </div>
      )}
      {/* If sale_status is Reserved, output that we ARE able to change the status while the sale is Reserved */} 
      {formData.sale_status === 'Reserved' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-sm text-green-500">
          Item is connected to a sale that has status <span className="text-green-300">Reserved</span>
        </div>
      )}
      {/* If sale_status is Finalized, output that we ARE able to change the status while the sale is Finalized */}
      {formData.sale_status === 'Finalized' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-sm text-green-500">
          This item is connected to a <span className="text-green-300">Finalized</span> sale
        </div>
      )}
      </div>
      </div>
      </div>
  );
};

export default StatusButtons; 
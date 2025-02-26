import React from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import { STATUS_OPTIONS, StatusOption } from './constants';
import { InventoryViewItem } from '@/types/inventory';
import { notify } from '@/utils/notifications';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface StatusButtonsProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isTransitionAllowed: (currentStatus: string, targetStatus: string, saleStatus: string | null) => boolean;
  handleInputChange: (key: string, value: any) => void;
  updateInventory: (params: { id: number; updates: any }) => Promise<any> | void;
  setErrors: (callback: (prev: string[]) => string[]) => void;
  setIsConnectedToSale: (value: boolean) => void;
  isConnectedToSale: boolean;
  handleRemoveFromSale: () => Promise<void>;
}

export const StatusButtons: React.FC<StatusButtonsProps> = ({
  inventory,
  formData,
  isTransitionAllowed,
  handleInputChange,
  updateInventory,
  setErrors,
  setIsConnectedToSale,
  isConnectedToSale,
  handleRemoveFromSale
}) => {
  const queryClient = useQueryClient();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {STATUS_OPTIONS.map(option => {
          const isCurrentStatus = formData.inventory_status === option.status;
          const isSold = formData.inventory_status === 'Sold';
          const isAllowed = !inventory || (
            !isSold ? 
              isTransitionAllowed(formData.inventory_status, option.status, inventory.sale_status) :
              // If sold, only allow For Sale if sale is Reserved
              option.status === 'For Sale' && formData.sale_status === 'Reserved'
          );
          
          // If connected to a sale, only allow For Sale status
          const isDisabled = !isAllowed || isCurrentStatus || (isConnectedToSale && option.status !== 'For Sale');
        
          return (
            <Button
              key={option.status}
              type="button"
              disabled={isDisabled}
              onClick={async () => {
                if (!inventory || !isAllowed || isCurrentStatus) return;
                
                // If this is the For Sale button, immediately enable tags and override price
                if (option.status === 'For Sale') {
                  // Set isConnectedToSale to false right away, before any async operations
                  setIsConnectedToSale(false);
                  
                  // Also force clear sale_id in the form data for immediate UI update
                  if (formData.sale_id) {
                    handleInputChange('sale_id', null);
                  }
                }
                
                try {
                  // Check if we should remove from sale (more reliable check)
                  if (option.status === 'For Sale' && (formData.sale_id || inventory.sale_id)) {
                    // Use the simplified handler
                    await handleRemoveFromSale();
                    return;
                  }

                  // For other status changes
                  const updates = {
                    inventory_status: option.status
                  };

                  handleInputChange('inventory_status', option.status);
                  await updateInventory({ 
                    id: inventory.inventory_id, 
                    updates 
                  });

                  notify('success', `${inventory.product_title} status updated to ${option.status}`);
                } catch (error) {
                  console.error('Error updating status:', error);
                  setErrors(prev => [...prev, 'Failed to update status']);
                  
                  // Revert all optimistic updates on error
                  handleInputChange('sale_id', inventory.sale_id);
                  handleInputChange('sale_status', inventory.sale_status);
                  handleInputChange('inventory_status', inventory.inventory_status);
                  
                  // Revert connection state based on inventory
                  // Only revert the connection state when it's not the For Sale button
                  if (option.status !== 'For Sale') {
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

                  notify('error', `Failed to update ${inventory?.product_title || 'item'} status to ${option.status}`);
                }
              }}
              className={clsx(
                'flex-1',
                'relative',
                'px-4 py-2',
                isCurrentStatus ? [
                  option.bgColor,
                  '!bg-opacity-100',
                  'ring-1',
                  option.status === 'Normal' && 'ring-gray-600',
                  option.status === 'Collection' && 'ring-orange-600',
                  option.status === 'For Sale' && 'ring-green-600',
                  'shadow-lg',
                  option.status === 'Normal' && 'shadow-black',
                  option.status === 'Collection' && 'shadow-black',
                  option.status === 'For Sale' && 'shadow-black',
                ] : [
                  'bg-gray-800',
                  'hover:bg-opacity-80',
                  'transition-all duration-200',
                  isDisabled && [
                    'opacity-50',
                    'cursor-not-allowed',
                    'pointer-events-none'
                  ]
                ]
              )}
            >
              <div className={clsx(
                "flex items-center justify-center gap-2",
                isCurrentStatus && "scale-110 transform"
              )}>
                <div className={clsx(
                  isCurrentStatus ? option.textColor : "text-gray-400"
                )}>
                  {option.icon}
                </div>
                <div className={clsx(
                  "font-medium whitespace-nowrap",
                  isCurrentStatus ? option.textColor : "text-gray-300"
                )}>
                  {option.label} ({option.shortcut})
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      {formData.inventory_status === 'Normal' && (
        <div className="flex items-center justify-center gap-1 text-md text-gray-400">
          Item is in <span className="text-gray-300">Normal</span> status
        </div>
      )}
      {formData.inventory_status === 'Collection' && (
        <div className="flex items-center justify-center gap-1 text-md text-orange-400">
          Item is in <span className="text-orange-300">Collection</span> status
        </div>
      )}
      {!formData.sale_id && formData.inventory_status === 'For Sale' && (
        <div className="flex items-center justify-center gap-1 text-md text-green-400">
          You are now able to connect this item to a sale
        </div>
      )}
      {/* If sale_status is Reserved, output that we ARE able to change the status while the sale is Reserved */} 
      {formData.sale_status === 'Reserved' && (
        <div className="flex items-center mt-10 justify-center gap-1 text-md text-green-500">
          Item is connected to a sale that has status <span className="text-green-300">Reserved</span>
        </div>
      )}
    </div>
  );
};

export default StatusButtons; 
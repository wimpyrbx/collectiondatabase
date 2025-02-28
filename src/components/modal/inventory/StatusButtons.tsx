import React, { useEffect } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui';
import { INVENTORY_STATUSES } from '@/constants/inventory';
import { InventoryViewItem } from '@/types/inventory';
import { notify } from '@/utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import { FaStore, FaArchive, FaShoppingCart, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { saleItemsConfig } from '@/hooks/viewHooks';

interface StatusButtonsProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isTransitionAllowed: (currentStatus: string, targetStatus: string, saleStatus: string | null) => boolean;
  handleInputChange: (key: string, value: any) => void;
  updateInventory: (params: { id: number; updates: any }) => Promise<any> | void;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  setIsConnectedToSale: (value: boolean) => void;
  isConnectedToSale: boolean;
  handleRemoveFromSale: () => Promise<void>;
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
  updateInventory,
  setErrors,
  setIsConnectedToSale,
  isConnectedToSale,
  handleRemoveFromSale,
  availableSales
}) => {
  const queryClient = useQueryClient();

  const getIcon = (iconType: keyof typeof STATUS_ICONS) => {
    const Icon = STATUS_ICONS[iconType];
    return <Icon />;
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Skip if any modifier key is pressed
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

      // Skip if we're in an input element
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const option = STATUS_OPTIONS.find(opt => opt.shortcut === key);
      
      if (!option || !inventory) return;

      const isSold = formData.inventory_status === 'Sold';
      const isAllowed = !isSold ? 
        isTransitionAllowed(formData.inventory_status, option.value, inventory.sale_status) :
        // If sold, only allow For Sale if sale is Reserved
        option.value === 'For Sale' && formData.sale_status === 'Reserved';

      // If connected to a sale, only allow For Sale status
      const isDisabled = !isAllowed || (isConnectedToSale && option.value !== 'For Sale');
      
      if (isDisabled) return;

      e.preventDefault();

      // If this is the For Sale button, immediately enable tags and override price
      if (option.value === 'For Sale') {
        setIsConnectedToSale(false);
        if (formData.sale_id) {
          handleInputChange('sale_id', null);
        }
      }

      try {
        // Check if we should remove from sale
        if (option.value === 'For Sale' && (formData.sale_id || inventory.sale_id)) {
          await handleRemoveFromSale();
          return;
        }

        // For other status changes
        const updates = {
          inventory_status: option.value
        };

        handleInputChange('inventory_status', option.value);
        await updateInventory({ 
          id: inventory.inventory_id, 
          updates 
        });

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
  }, [inventory, formData, isTransitionAllowed, isConnectedToSale, handleInputChange, updateInventory, handleRemoveFromSale, setErrors, queryClient]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {STATUS_OPTIONS.map(option => {
          const isCurrentStatus = formData.inventory_status === option.value;
          const isSold = formData.inventory_status === 'Sold';
          const isAllowed = !inventory || (
            !isSold ? 
              isTransitionAllowed(formData.inventory_status, option.value, inventory.sale_status) :
              // If sold, only allow For Sale if sale is Reserved
              option.value === 'For Sale' && formData.sale_status === 'Reserved'
          );
          
          // If connected to a sale, only allow For Sale status
          const isDisabled = !isAllowed || isCurrentStatus || (isConnectedToSale && option.value !== 'For Sale');
        
          return (
            <Button
              key={option.value}
              type="button"
              disabled={isDisabled}
              onClick={async () => {
                if (!inventory || !isAllowed || isCurrentStatus) return;
                
                // If this is the For Sale button, immediately enable tags and override price
                if (option.value === 'For Sale') {
                  // Set isConnectedToSale to false right away, before any async operations
                  setIsConnectedToSale(false);
                  
                  // Also force clear sale_id in the form data for immediate UI update
                  if (formData.sale_id) {
                    handleInputChange('sale_id', null);
                  }
                }
                
                try {
                  // Check if we should remove from sale (more reliable check)
                  if (option.value === 'For Sale' && (formData.sale_id || inventory.sale_id)) {
                    // Use the simplified handler
                    await handleRemoveFromSale();
                    return;
                  }

                  // For other status changes
                  const updates = {
                    inventory_status: option.value
                  };

                  handleInputChange('inventory_status', option.value);
                  await updateInventory({ 
                    id: inventory.inventory_id, 
                    updates 
                  });

                  notify('success', `${inventory.product_title} status updated to ${option.value}`);
                } catch (error) {
                  console.error('Error updating status:', error);
                  setErrors(prev => [...prev, 'Failed to update status']);
                  
                  // Revert all optimistic updates on error
                  handleInputChange('sale_id', inventory.sale_id);
                  handleInputChange('sale_status', inventory.sale_status);
                  handleInputChange('inventory_status', inventory.inventory_status);
                  
                  // Revert connection state based on inventory
                  // Only revert the connection state when it's not the For Sale button
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

                  notify('error', `Failed to update ${inventory?.product_title || 'item'} status to ${option.value}`);
                }
              }}
              className={clsx(
                'flex-1',
                'relative',
                'px-4 h-[53px]',
                isCurrentStatus ? [
                  option.styles.bgColor,
                  '!bg-opacity-100',
                  'ring-1',
                  option.styles.borderColor,
                  'shadow-lg',
                  'shadow-black',
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
                  isCurrentStatus ? option.styles.textColor : "text-gray-400"
                )}>
                  {getIcon(option.iconType)}
                </div>
                <div className={clsx(
                  "font-medium whitespace-nowrap",
                  isCurrentStatus ? option.styles.textColor : "text-gray-300"
                )}>
                  {option.label} ({option.shortcut})
                </div>
              </div>
            </Button>
          );
        })}
      </div>
      {formData.inventory_status === 'Normal' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-md text-gray-400">
          Item is in <span className="text-gray-300">Normal</span> status
        </div>
      )}
      {formData.inventory_status === 'Collection' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-md text-orange-400">
          Item is in <span className="text-orange-300">Collection</span> status
        </div>
      )}
      {!formData.sale_id && formData.inventory_status === 'For Sale' && (
        <div className="flex items-center justify-center gap-1 pt-2 text-md text-green-400">
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
        <div className="flex items-center mt-10 justify-center gap-1 pt-2 text-md text-green-500">
          Item is connected to a sale that has status <span className="text-green-300">Reserved</span>
        </div>
      )}
      {/* If sale_status is Finalized, output that we ARE able to change the status while the sale is Finalized */}
      {formData.sale_status === 'Finalized' && (
        <div className="flex items-center mt-10 justify-center gap-1 pt-2 text-md text-green-500">
          This item is connected to a <span className="text-green-300">Finalized</span> sale
        </div>
      )}
    </div>
  );
};

export default StatusButtons; 
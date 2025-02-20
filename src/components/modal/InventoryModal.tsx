import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { FaBox, FaTimes, FaStore, FaShoppingCart, FaArchive, FaCheck, FaExclamationTriangle, FaDollarSign, FaCalendar, FaUser, FaMapMarker, FaTag, FaTags, FaChevronLeft, FaChevronRight, FaTrash, FaSave } from 'react-icons/fa';
import { getInventoryWithFallbackUrl } from '@/utils/imageUtils';
import { Button } from '@/components/ui';
import { useInventoryStatusTransitionsCache } from '@/hooks/viewHooks';
import { ImageContainerInventory } from '@/components/image/ImageContainerInventory';
import { FormElement } from '@/components/formelement';
import { useInventoryModal } from '@/hooks/useInventoryModal';
import clsx from 'clsx';
import DisplayError from '@/components/ui/DisplayError';
import type { InventoryStatusTransitionMap } from '@/types/inventory_status';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TagWithRelationships } from '@/types/tags';
import * as Icons from 'react-icons/fa';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TooltipStyle } from '@/utils/tooltip';
import { Dialog } from '@headlessui/react';
import { useCallback } from 'react';
import { debounce } from 'lodash';
import { FiClock } from 'react-icons/fi';

// Add the TagButton component
const TagButton: React.FC<{
  tag: TagWithRelationships;
  isSelected: boolean;
  onToggle: (tag: TagWithRelationships) => void;
}> = ({ tag, isSelected, onToggle }) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const { color = 'gray' } = tag;

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle(tag)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          isSelected ? ["bg-green-500/20", "text-green-300"] : ["bg-gray-800 hover:bg-gray-700", "text-gray-300"]
        )}
      >
        {tag.display_type === 'icon' && tag.display_value ? (
          React.createElement((Icons as any)[tag.display_value], {
            className: clsx("w-3 h-3", "text-white", "mr-1")
          })
        ) : tag.display_type === 'image' && tag.display_value ? (
          <img
            src={tag.display_value}
            alt={tag.name}
            className="w-4 h-4"
          />
        ) : null}
        <span className="text-sm">{tag.name}</span>
        {isSelected && (
          <FaCheck className="w-3 h-3" />
        )}
      </button>
      <Tooltip
        text={`Click to ${isSelected ? 'remove' : 'add'} ${tag.name} tag`}
        isOpen={isHovered}
        elementRef={buttonRef}
        placement="top"
        size="sm"
        style={TooltipStyle.minimal}
      />
    </div>
  );
};

// Status options configuration
const STATUS_OPTIONS = [
  {
    status: 'Normal',
    label: 'Normal',
    icon: <FaStore />,
    shortcut: 'N',
    bgColor: 'bg-gray-600',
    textColor: 'text-gray-100',
  },
  {
    status: 'Collection',
    label: 'Collection',
    icon: <FaArchive />,
    shortcut: 'C',
    bgColor: 'bg-cyan-600',
    textColor: 'text-cyan-100',
  },
  {
    status: 'For Sale',
    label: 'For Sale',
    icon: <FaShoppingCart />,
    shortcut: 'F',
    bgColor: 'bg-green-600',
    textColor: 'text-green-100',
  },
  {
    status: 'Sold',
    label: 'Sold',
    icon: <FaCheck />,
    shortcut: '',
    bgColor: 'bg-green-600',
    textColor: 'text-green-100',
  }
];

interface InventoryModalProps {
  inventory: InventoryViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: (inventoryId: number) => void;
  mode?: 'create' | 'edit';
  tableData?: InventoryViewItem[];
  onNavigate?: (inventoryId: number) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  isOpen,
  onClose,
  onUpdateSuccess,
  mode = 'edit',
  tableData = [],
  onNavigate,
  currentPage = 1,
  onPageChange,
  pageSize = 10
}) => {
  const { transitions, isTransitionAllowed, getRequiredSaleStatus } = useInventoryStatusTransitionsCache();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = React.useState<TagWithRelationships[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = React.useState(false);

  // Query to fetch available inventory tags
  const { data: availableTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['inventory_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('view_inventory_tags').select('*');
      if (error) throw error;
      return data as TagWithRelationships[] || [];
    }
  });

  // Initialize selected tags when inventory changes
  React.useEffect(() => {
    if (inventory?.tags) {
      const inventoryTags = availableTags.filter(tag => 
        inventory.tags.some(t => t.id === tag.id)
      );
      setSelectedTags(inventoryTags);
    } else {
      setSelectedTags([]);
    }
  }, [inventory, availableTags]);

  // Handle tag selection
  const handleTagToggle = async (tag: TagWithRelationships) => {
    if (!inventory) {
      // For new inventory items, just update the local state
      setSelectedTags(prev => {
        const isSelected = prev.some(t => t.id === tag.id);
        return isSelected
          ? prev.filter(t => t.id !== tag.id)
          : [...prev, tag];
      });
      return;
    }

    try {
      const isSelected = selectedTags.some(t => t.id === tag.id);
      
      if (isSelected) {
        // Remove tag relationship
        const { error } = await supabase
          .from('inventory_tag_relationships')
          .delete()
          .match({ 
            inventory_id: inventory.inventory_id, 
            tag_id: tag.id 
          });
        
        if (error) throw error;
      } else {
        // Add tag relationship
        const { error } = await supabase
          .from('inventory_tag_relationships')
          .insert({ 
            inventory_id: inventory.inventory_id, 
            tag_id: tag.id 
          });
        
        if (error) throw error;
      }

      // Update inventory updated_at timestamp
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ inventory_updated_at: new Date().toISOString() })
        .eq('id', inventory.inventory_id);

      if (updateError) throw updateError;

      // Update local state
      setSelectedTags(prev => {
        return isSelected
          ? prev.filter(t => t.id !== tag.id)
          : [...prev, tag];
      });

      // Update cache
      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
        if (!old) return old;
        return old.map(i => {
          if (i.inventory_id === inventory.inventory_id) {
            return {
              ...i,
              tags: isSelected
                ? i.tags.filter(t => t.id !== tag.id)
                : [...i.tags, tag]
            };
          }
          return i;
        });
      });

    } catch (error) {
      console.error('Error toggling tag:', error);
      setErrors(prev => [...prev, 'Failed to update tag']);
    }
  };

  const {
    formData,
    errors,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating,
    setErrors,
    pendingImage,
    handlePendingImageChange
  } = useInventoryModal({
    inventory,
    isOpen,
    onClose,
    onSuccess: onUpdateSuccess,
    mode
  });

  // Navigation handling
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!inventory || !tableData.length || !onNavigate) return;

    const currentIndex = tableData.findIndex(item => item.inventory_id === inventory.inventory_id);
    if (currentIndex === -1) return;

    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Handle wrapping
    if (newIndex < 0) newIndex = tableData.length - 1;
    if (newIndex >= tableData.length) newIndex = 0;

    // Calculate new page if needed
    const newPage = Math.floor(newIndex / pageSize) + 1;
    if (newPage !== currentPage && onPageChange) {
      onPageChange(newPage);
    }

    onNavigate(tableData[newIndex].inventory_id);
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when not in form elements
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory, tableData]);

  // Add keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      
      // Find the matching status option and update status if allowed
      const statusOption = STATUS_OPTIONS.find(option => option.shortcut === key);
      if (statusOption && inventory) {
        e.preventDefault();
        const isAllowed = isTransitionAllowed(inventory.inventory_status, statusOption.status, inventory.sale_status);
        if (isAllowed) {
          try {
            // Optimistically update the UI
            handleInputChange('inventory_status', statusOption.status);
            
            // Update the cache optimistically
            queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
              if (!old) return old;
              return old.map(item => {
                if (item.inventory_id === inventory.inventory_id) {
                  return {
                    ...item,
                    inventory_status: statusOption.status
                  };
                }
                return item;
              });
            });

            // Also update the current inventory object
            inventory.inventory_status = statusOption.status;

            // Save to database
            const { error } = await supabase
              .from('inventory')
              .update({ 
                inventory_status: statusOption.status,
                inventory_updated_at: new Date().toISOString()
              })
              .eq('id', inventory.inventory_id);

            if (error) throw error;
          } catch (error) {
            console.error('Error updating status:', error);
            setErrors(prev => [...prev, 'Failed to update status']);
            
            // Revert optimistic update on error
            handleInputChange('inventory_status', inventory.inventory_status);
            queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
              if (!old) return old;
              return old.map(item => {
                if (item.inventory_id === inventory.inventory_id) {
                  return {
                    ...item,
                    inventory_status: inventory.inventory_status,
                    inventory_updated_at: new Date().toISOString()
                  };
                }
                return item;
              });
            });
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleInputChange, inventory, isTransitionAllowed, queryClient]);

  // Get available status transitions
  const getAvailableStatusTransitions = () => {
    if (!inventory || !transitions) return [];
    
    const currentStatus = inventory.inventory_status;
    const allowedTransitions = transitions[currentStatus] || {};
    
    return Object.keys(allowedTransitions).map(status => ({
      value: status,
      label: status
    }));
  };

  // Add this after the other hooks
  const debouncedUpdateOverridePrice = useCallback(
    debounce(async (value: string | null, inventoryId: number) => {
      try {
        const numericValue = value ? Number(value) : null;
        const now = new Date().toISOString();
        
        // Update the database
        const { error } = await supabase
          .from('inventory')
          .update({ 
            override_price: numericValue,
            inventory_updated_at: now
          })
          .eq('id', inventoryId);

        if (error) throw error;

        // Update the cache
        queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
          if (!old) return old;
          return old.map(item => {
            if (item.inventory_id === inventoryId) {
              return {
                ...item,
                override_price: numericValue,
                inventory_updated_at: now
              };
            }
            return item;
          });
        });

        // Also update the current inventory object
        if (inventory) {
          inventory.override_price = numericValue;
          inventory.inventory_updated_at = now;
        }
      } catch (error) {
        console.error('Error updating override price:', error);
        setErrors(prev => [...prev, 'Failed to update override price']);
      }
    }, 1000),
    [queryClient, inventory]
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="xl">
        <Card modal className="w-[1024px]">
          <Card.Header
            icon={<FaBox />}
            iconColor="text-cyan-500"
            title={mode === 'create' ? 'New Inventory Item' : 'Edit Inventory Item'}
            bgColor="bg-cyan-500/50"
            rightContent={
              <div className="shrink-0 ml-4 whitespace-nowrap flex items-center gap-4">
                {inventory?.inventory_updated_at && 
                 new Date().getTime() - new Date(inventory.inventory_updated_at).getTime() <= 3600000 && (
                  <span className="text-cyan-300 text-sm flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    Recently Updated
                  </span>
                )}
                {inventory ? `ID: ${inventory.inventory_id}` : undefined}
              </div>
            }
          />
          <Card.Body>
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Image and Product Info */}
              <div className="col-span-3">
                <div className="sticky top-0 space-y-4">
                  <ImageContainerInventory
                    id={inventory?.inventory_id || -1}
                    title={inventory?.product_title || 'New Inventory'}
                    onError={(message) => setErrors(prev => [...prev, message])}
                    className="w-full"
                    pendingImage={pendingImage}
                    onPendingImageChange={handlePendingImageChange}
                    isCreateMode={mode === 'create'}
                    productId={inventory?.product_id}
                  />
                  
                  {/* Product Information Display */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaBox className="text-cyan-400" />
                        Product Information
                      </h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-gray-400">Title:</span>
                        <span className="text-gray-200">{inventory?.product_title || '-'}</span>
                        
                        {inventory?.product_variant && (
                          <>
                            <span className="text-gray-400">Variant:</span>
                            <span className="text-gray-200">{inventory.product_variant}</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">Type:</span>
                        <span className="text-gray-200">{inventory?.product_type_name || '-'}</span>
                        
                        <span className="text-gray-400">Group:</span>
                        <span className="text-gray-200">{inventory?.product_group_name || '-'}</span>
                        
                        {inventory?.release_year && (
                          <>
                            <span className="text-gray-400">Year:</span>
                            <span className="text-gray-200">{inventory.release_year}</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">Region:</span>
                        <span className="text-gray-200">{inventory?.region_name || '-'}</span>
                        
                        <span className="text-gray-400">Rating:</span>
                        <span className="text-gray-200">{inventory?.rating_name || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="col-span-9 space-y-6">
                {/* Status and Sale Information Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Status Section */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaBox className="text-blue-400" />
                        Inventory Status
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(option => {
                          const isCurrentStatus = formData.inventory_status === option.status;
                          const isAllowed = !inventory || isTransitionAllowed(inventory.inventory_status, option.status, inventory.sale_status);

                          return isCurrentStatus ? (
                            // Current status displayed as a prominent badge
                            <div
                              key={option.status}
                              className={clsx(
                                'flex items-center gap-2 px-4 py-2 rounded-lg',
                                option.bgColor,
                                option.textColor,
                                'shadow-lg shadow-black/20',
                                'ring-2 ring-offset-2 ring-offset-gray-900 ring-white/20'
                              )}
                            >
                              {option.icon}
                              <span>{option.label}</span>
                              {option.shortcut && (
                                <span className="text-xs opacity-50 ml-1">[{option.shortcut}]</span>
                              )}
                            </div>
                          ) : (
                            // Other statuses as buttons
                            <Button
                              key={option.status}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!isAllowed || !inventory) return;

                                try {
                                  const now = new Date().toISOString();
                                  // Optimistically update the UI
                                  handleInputChange('inventory_status', option.status);
                                  
                                  // Update the cache optimistically
                                  queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
                                    if (!old) return old;
                                    return old.map(item => {
                                      if (item.inventory_id === inventory.inventory_id) {
                                        return {
                                          ...item,
                                          inventory_status: option.status,
                                          inventory_updated_at: now
                                        };
                                      }
                                      return item;
                                    });
                                  });

                                  // Also update the current inventory object
                                  inventory.inventory_status = option.status;
                                  inventory.inventory_updated_at = now;

                                  // Save to database
                                  const { error } = await supabase
                                    .from('inventory')
                                    .update({ 
                                      inventory_status: option.status,
                                      inventory_updated_at: now
                                    })
                                    .eq('id', inventory.inventory_id);

                                  if (error) throw error;
                                } catch (error) {
                                  console.error('Error updating status:', error);
                                  setErrors(prev => [...prev, 'Failed to update status']);
                                  
                                  // Revert optimistic update on error
                                  handleInputChange('inventory_status', inventory.inventory_status);
                                  queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
                                    if (!old) return old;
                                    return old.map(item => {
                                      if (item.inventory_id === inventory.inventory_id) {
                                        return {
                                          ...item,
                                          inventory_status: inventory.inventory_status,
                                          inventory_updated_at: inventory.inventory_updated_at
                                        };
                                      }
                                      return item;
                                    });
                                  });
                                }
                              }}
                              type="button"
                              disabled={!isAllowed}
                              bgColor="bg-gray-800"
                              textColor={option.textColor}
                              size="xs"
                              iconLeft={option.icon}
                              className={clsx(
                                'transition-all duration-200',
                                !isAllowed && 'opacity-30 cursor-default pointer-events-none hover:bg-gray-800',
                                isAllowed && 'hover:bg-opacity-50'
                              )}
                            >
                              {option.label}
                              {option.shortcut && (
                                <span className="text-xs opacity-50 ml-1">[{option.shortcut}]</span>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sale Information */}
                  <div className={clsx(
                    "bg-gray-900/50 rounded-lg overflow-hidden transition-opacity duration-200",
                    formData.inventory_status !== 'For Sale' && formData.inventory_status !== 'Sold' && "opacity-50"
                  )}>
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaShoppingCart className="text-orange-400" />
                        Sale Information
                      </h3>
                    </div>
                    <div className="p-4">
                      {inventory?.sale_id ? (
                        <div className="grid grid-cols-2 gap-4">
                          <FormElement
                            elementType="input"
                            label="Buyer"
                            labelIcon={<FaUser />}
                            labelIconColor="text-cyan-400"
                            initialValue={formData.sale_buyer}
                            onValueChange={(value) => handleInputChange('sale_buyer', value)}
                          />
                          <FormElement
                            elementType="input"
                            label="Sale Status"
                            labelIcon={<FaShoppingCart />}
                            labelIconColor="text-orange-400"
                            initialValue={formData.sale_status}
                            onValueChange={(value) => handleInputChange('sale_status', value)}
                          />
                          <FormElement
                            elementType="input"
                            label="Sold Price (NOK)"
                            labelIcon={<FaDollarSign />}
                            labelIconColor="text-green-400"
                            initialValue={formData.sold_price}
                            onValueChange={(value) => handleInputChange('sold_price', value)}
                            numericOnly
                          />
                          <FormElement
                            elementType="input"
                            label="Sale Date"
                            labelIcon={<FaCalendar />}
                            labelIconColor="text-purple-400"
                            initialValue={formData.sale_date}
                            onValueChange={(value) => handleInputChange('sale_date', value)}
                          />
                          <div className="col-span-2">
                            <FormElement
                              elementType="textarea"
                              label="Sale Notes"
                              labelIcon={<FaTag />}
                              labelIconColor="text-yellow-400"
                              initialValue={formData.sale_notes}
                              onValueChange={(value) => handleInputChange('sale_notes', value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                          <FaExclamationTriangle className="text-yellow-500" />
                          Not connected to any sale
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pricing and Purchase Information Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Price Section */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaDollarSign className="text-green-400" />
                        Pricing Information
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        {/* Display Complete and New prices */}
                        <div className={clsx(
                          "text-sm",
                          !inventory?.tags?.some(t => t.id === 2) && "opacity-100",
                          inventory?.tags?.some(t => t.id === 2) && "opacity-50"
                        )}>
                          <span className="text-gray-400">Complete (CIB):</span>
                          <span className="text-gray-200 ml-2">
                            {inventory?.prices?.complete?.nok_fixed 
                              ? `NOK ${inventory.prices.complete.nok_fixed},-` 
                              : 'N/A'}
                          </span>
                        </div>
                        <div className={clsx(
                          "text-sm",
                          inventory?.tags?.some(t => t.id === 2) && "opacity-100",
                          !inventory?.tags?.some(t => t.id === 2) && "opacity-50"
                        )}>
                          <span className="text-gray-400">New/Sealed:</span>
                          <span className="text-gray-200 ml-2">
                            {inventory?.prices?.new?.nok_fixed 
                              ? `NOK ${inventory.prices.new.nok_fixed},-` 
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Override Price Input */}
                        <FormElement
                          elementType="input"
                          label="Override Price (NOK)"
                          labelIcon={<FaDollarSign />}
                          labelIconColor="text-green-400"
                          labelPosition='above'
                          initialValue={formData.override_price}
                          onValueChange={(value) => {
                            handleInputChange('override_price', value);
                            if (inventory) {
                              debouncedUpdateOverridePrice(value as string, inventory.inventory_id);
                            }
                          }}
                          numericOnly
                        />

                        {/* Final Price Display */}
                        <div className="pt-2 border-t border-gray-700">
                          <div className="text-sm font-medium">
                            <span className="text-gray-400">Final Price:</span>
                            <span className="text-gray-200 ml-2">
                              {inventory?.final_price 
                                ? `NOK ${inventory.final_price},-` 
                                : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purchase Information */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaStore className="text-purple-400" />
                        Purchase Information
                      </h3>
                    </div>
                    <div className="p-4">
                      {inventory?.purchase_id ? (
                        <div className="grid grid-cols-1 gap-4">
                          <FormElement
                            elementType="input"
                            label="Seller"
                            labelIcon={<FaUser />}
                            labelIconColor="text-cyan-400"
                            initialValue={formData.purchase_seller}
                            onValueChange={(value) => handleInputChange('purchase_seller', value)}
                          />
                          <FormElement
                            elementType="input"
                            label="Origin"
                            labelIcon={<FaMapMarker />}
                            labelIconColor="text-red-400"
                            initialValue={formData.purchase_origin}
                            onValueChange={(value) => handleInputChange('purchase_origin', value)}
                          />
                          <FormElement
                            elementType="input"
                            label="Purchase Cost (NOK)"
                            labelIcon={<FaDollarSign />}
                            labelIconColor="text-green-400"
                            initialValue={formData.purchase_cost}
                            onValueChange={(value) => handleInputChange('purchase_cost', value)}
                            numericOnly
                          />
                          <FormElement
                            elementType="input"
                            label="Purchase Date"
                            labelIcon={<FaCalendar />}
                            labelIconColor="text-purple-400"
                            initialValue={formData.purchase_date}
                            onValueChange={(value) => handleInputChange('purchase_date', value)}
                          />
                        </div>
                      ) : (
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                          <FaExclamationTriangle className="text-yellow-500" />
                          Not connected to any purchase
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Tags Section */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaTags className="text-purple-400" />
                      Inventory Tags
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {isLoadingTags ? (
                        <div className="text-gray-400 text-sm">Loading tags...</div>
                      ) : availableTags.length === 0 ? (
                        <div className="text-gray-400 text-sm">No tags available</div>
                      ) : (
                        availableTags.map(tag => (
                          <TagButton
                            key={tag.id}
                            tag={tag}
                            isSelected={selectedTags.some(t => t.id === tag.id)}
                            onToggle={handleTagToggle}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex items-center justify-between w-full">
              {/* Left side - Previous and Cancel */}
              <div className="flex gap-2">
                {onNavigate && (
                  <Button
                    onClick={() => handleNavigate('prev')}
                    bgColor="bg-gray-800"
                    hoverBgColor={true}
                    iconLeft={<FaChevronLeft />}
                    disabled={!tableData.length || tableData[0]?.inventory_id === inventory?.inventory_id}
                  >
                    Previous
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  bgColor="bg-orange-800"
                  hoverBgColor={true}
                >
                  Cancel
                </Button>
              </div>

              {/* Center - Delete button or explanation */}
              <div className="flex-1 flex justify-center">
                {(!inventory?.purchase_id && !inventory?.sale_id) ? (
                  <Button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    bgColor="bg-red-900/50"
                    hoverBgColor={true}
                    iconLeft={<FaTrash />}
                  >
                    Delete
                  </Button>
                ) : inventory && (
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    <FaExclamationTriangle className="text-yellow-500" />
                    Cannot delete - Item has {[
                      inventory.purchase_id && 'purchase',
                      inventory.sale_id && 'sale'
                    ].filter(Boolean).join(' and ')} linked
                  </span>
                )}
              </div>

              {/* Right side - Save and Next */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  bgColor="bg-green-600/50"
                  hoverBgColor={false}
                  iconLeft={<FaSave />}
                  disabled={isUpdating}
                  className={clsx(
                    "transition-colors duration-200",
                    isUpdating && "opacity-50 bg-gray-800/50 cursor-not-allowed"
                  )}
                >
                  {isUpdating ? 'Saving...' : 'Save'}
                </Button>
                {onNavigate && (
                  <Button
                    onClick={() => handleNavigate('next')}
                    bgColor="bg-gray-800"
                    hoverBgColor={true}
                    iconRight={<FaChevronRight />}
                    disabled={!tableData.length || tableData[tableData.length - 1]?.inventory_id === inventory?.inventory_id}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
            {errors.length > 0 && (
              <div className="mt-4">
                <DisplayError
                  errors={errors}
                />
              </div>
            )}
          </Card.Footer>
        </Card>
      </Modal>

      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        className="relative z-[100]"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-gray-800 p-6 shadow-xl">
            <Dialog.Title className="text-lg font-medium text-gray-200 mb-4">
              Delete Inventory Item
            </Dialog.Title>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this inventory item? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsDeleteConfirmOpen(false)}
                bgColor="bg-gray-800"
                hoverBgColor={true}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    if (inventory) {
                      const { error } = await supabase
                        .from('inventory')
                        .delete()
                        .eq('id', inventory.inventory_id);
                      
                      if (error) throw error;
                      
                      // Update cache
                      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
                        if (!old) return old;
                        return old.filter(i => i.inventory_id !== inventory.inventory_id);
                      });
                      
                      onClose();
                    }
                  } catch (error) {
                    console.error('Error deleting inventory:', error);
                    setErrors(prev => [...prev, 'Failed to delete inventory item']);
                  }
                  setIsDeleteConfirmOpen(false);
                }}
                bgColor="bg-red-900/50"
                hoverBgColor={true}
                iconLeft={<FaTrash />}
              >
                Delete
              </Button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default InventoryModal;
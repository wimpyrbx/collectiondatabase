import React, { useEffect, useState, useMemo } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { FaBox, FaTimes, FaStore, FaShoppingCart, FaArchive, FaCheck, FaExclamationTriangle, FaDollarSign, FaCalendar, FaUser, FaMapMarker, FaTag, FaTags, FaChevronLeft, FaChevronRight, FaTrash, FaSave, FaCubes, FaLayerGroup, FaGlobe, FaChevronDown } from 'react-icons/fa';
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
import { Dialog, Combobox } from '@headlessui/react';
import { useCallback } from 'react';
import { debounce } from 'lodash';
import { FiClock } from 'react-icons/fi';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import regionsData from '@/data/regions.json';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import { notifyTagAction } from '@/utils/notifications';
import { notify } from '@/utils/notifications';
import type { SaleViewItem } from '@/types/sale';
import { BaseStyledContainer } from '@/components/ui/BaseStyledContainer';

// Add the TagButton component
const TagButton: React.FC<{
  tag: TagWithRelationships;
  isSelected: boolean;
  onToggle: (tag: TagWithRelationships) => void;
  isProcessing?: boolean;
}> = ({ tag, isSelected, onToggle, isProcessing }) => {
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
        disabled={isProcessing}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          isSelected ? ["bg-green-500/20", "text-green-300"] : ["bg-gray-800 hover:bg-gray-700", "text-gray-300"],
          isProcessing && "opacity-50 cursor-not-allowed"
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
        text={isProcessing ? 'Processing...' : `Click to ${isSelected ? 'remove' : 'add'} ${tag.name} tag`}
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
    bgColor: 'bg-gray-700',
    textColor: 'text-gray-100',
  },
  {
    status: 'Collection',
    label: 'Collection',
    icon: <FaArchive />,
    shortcut: 'C',
    bgColor: 'bg-orange-800',
    textColor: 'text-white',
  },
  {
    status: 'For Sale',
    label: 'For Sale',
    icon: <FaShoppingCart />,
    shortcut: 'F',
    bgColor: 'bg-green-800',
    textColor: 'text-green-100',
  }
];

// Add this type for purchases
type PurchaseItem = {
  purchase_id: number;
  seller: string;
  origin: string;
  purchase_date: string;
  item_count: number;
};

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
  const { deleteInventory, updateInventory, addTag, removeTag } = useInventoryTable();
  const [isTagProcessing, setIsTagProcessing] = useState<Record<number, boolean>>({});
  const [isTagPanelProcessing, setIsTagPanelProcessing] = useState(false);
  const [localSalesTotals, setLocalSalesTotals] = useState<Record<number, { items: number, total: number }>>({});

  // Query to fetch available inventory tags
  const { data: availableTags = [], isLoading: isLoadingTags } = useQuery({
    queryKey: ['inventory_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('view_inventory_tags').select('*').order('name');
      if (error) throw error;
      return data as TagWithRelationships[] || [];
    }
  });

  // Query to fetch available sales with Reserved status
  const { data: availableSales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_sales')
        .select('*')
        .eq('sale_status', 'Reserved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SaleViewItem[];
    }
  });

  // Add the purchase query
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [isSearchingPurchases, setIsSearchingPurchases] = useState(false);
  
  const { data: availablePurchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('view_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      if (error) throw error;
      return data as PurchaseItem[];
    }
  });

  // Filter purchases based on search query
  const filteredPurchases = useMemo(() => {
    return purchaseSearchQuery === ''
      ? availablePurchases
      : availablePurchases.filter((purchase) => {
          const searchLower = purchaseSearchQuery.toLowerCase();
          return (
            purchase.seller?.toLowerCase().includes(searchLower) ||
            purchase.origin?.toLowerCase().includes(searchLower) ||
            purchase.purchase_id.toString().includes(searchLower)
          );
        });
  }, [availablePurchases, purchaseSearchQuery]);

  // Initialize selected tags when inventory changes or when modal opens
  React.useEffect(() => {
    if (!isOpen || !inventory || !availableTags.length) return;
    
    const cachedInventory = queryClient
      .getQueryData<InventoryViewItem[]>(['inventory'])
      ?.find(item => item.inventory_id === inventory.inventory_id);

    if (!cachedInventory) return;
    
    // Combine both inventory and product tags from the cached data
    const allTags = [
      ...(cachedInventory.tags || []),
      ...(cachedInventory.product_tags || [])
    ].filter((tag, index, self) => 
      index === self.findIndex(t => t.id === tag.id)
    );

    const newTags = allTags.length > 0
      ? availableTags.filter(tag => allTags.some(t => t.id === tag.id))
      : [];

    setSelectedTags(newTags);
  }, [isOpen, inventory?.inventory_id, availableTags, queryClient]);

  // Handle tag selection
  const handleTagToggle = useCallback(async (tag: TagWithRelationships) => {
    if (!inventory) return;
    if (isTagProcessing[tag.id]) return;

    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    // Immediate local state update
    setSelectedTags(prev => 
      isSelected 
        ? prev.filter(t => t.id !== tag.id)
        : [...prev, tag]
    );

    try {
      setIsTagProcessing(prev => ({ ...prev, [tag.id]: true }));
      setIsTagPanelProcessing(true);

      if (isSelected) {
        await removeTag({ inventoryId: inventory.inventory_id, tagId: tag.id });
        notify('remove',
          <span>
            Removed <strong>{tag.name}</strong> from {inventory.product_title}
            {inventory.product_variant && ` (${inventory.product_variant})`}
          </span>
        );
      } else {
        await addTag({ inventoryId: inventory.inventory_id, tagId: tag.id });
        notify('add', 
          <span>
            Added <strong>{tag.name}</strong> to {inventory.product_title}
            {inventory.product_variant && ` (${inventory.product_variant})`}
          </span>
        );
      }
    } catch (error) {
      // Revert on error
      setSelectedTags(prev => 
        isSelected 
          ? [...prev, tag]
          : prev.filter(t => t.id !== tag.id)
      );
      notify('error', `Failed to update ${inventory.product_title}`);
    } finally {
      setIsTagProcessing(prev => ({ ...prev, [tag.id]: false }));
      setIsTagPanelProcessing(false);
    }
  }, [inventory, selectedTags, addTag, removeTag, isTagProcessing]);

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
  const handleNavigate = React.useCallback((direction: 'prev' | 'next') => {
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
  }, [inventory, tableData, onNavigate, currentPage, onPageChange, pageSize]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

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
      } else if (e.key === 'Delete' && !inventory?.purchase_id && !inventory?.sale_id) {
        e.preventDefault();
        setIsDeleteConfirmOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNavigate, inventory]);

  // Add keyboard shortcut handler
  React.useEffect(() => {
    if (!isOpen || !inventory) return;

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
      if (!statusOption || !inventory) return;

      if (isTransitionAllowed(formData.inventory_status, statusOption.status, inventory.sale_status)) {
        e.preventDefault();
        try {
          const updates = {
            inventory_status: statusOption.status
          };

          // Update local form state first
          handleInputChange('inventory_status', statusOption.status);

          // Call the mutation
          await updateInventory({ 
            id: inventory.inventory_id, 
            updates 
          });
          notify('success', `${inventory.product_title} status updated to ${statusOption.status}`);
        } catch (error) {
          console.error('Error updating status:', error);
          setErrors(prev => [...prev, 'Failed to update status']);
          
          // Revert local form state on error
          // Revert optimistic update on error
          handleInputChange('inventory_status', inventory.inventory_status);
          queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
            if (!old) return old;
            return old.map(item => {
              if (item.inventory_id === inventory.inventory_id) {
                return {
                  ...item,
                  inventory_status: inventory.inventory_status
                };
              }
              return item;
            });
          });
          notify('error', `Failed to update ${inventory.product_title} status to ${statusOption.status}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inventory, handleInputChange, queryClient, isTransitionAllowed]);

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

  const handleDelete = async () => {
    if (!inventory) return;
    
    try {
      // First delete related records from sale_items
      const { error: saleItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('inventory_id', inventory.inventory_id);

      if (saleItemsError) throw saleItemsError;

      // Then delete related records from inventory_history
      const { error: historyError } = await supabase
        .from('inventory_history')
        .delete()
        .eq('inventory_id', inventory.inventory_id);

      if (historyError) throw historyError;

      // Finally delete from inventory table
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', inventory.inventory_id);

      if (error) throw error;

      // Remove from cache
      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
        if (!old) return old;
        return old.filter(item => item.inventory_id !== inventory.inventory_id);
      });

      notify('success', `${inventory.product_title} deleted from inventory`);
        onClose();
    } catch (error) {
      console.error('Error deleting inventory:', error);
      setErrors(prev => [...prev, 'Failed to delete inventory item']);
      notify('error', `Failed to delete ${inventory.product_title}`);
    }
    setIsDeleteConfirmOpen(false);
  };

  // Add this utility function for cleaner code
  const updateSaleTotals = useCallback((saleId: number, action: 'add' | 'remove') => {
    if (!inventory || !saleId) return;
    
    // Get the current sale data
    const currentSale = availableSales.find(s => s.sale_id === saleId);
    if (!currentSale) return;
    
    // Get the inventory item's price
    const currentInventory = queryClient.getQueryData<InventoryViewItem[]>(['inventory'])?.find(
      i => i.inventory_id === inventory.inventory_id
    );
    const itemPrice = currentInventory?.final_price || inventory.final_price || 0;
    
    // Calculate new totals
    const newItemCount = action === 'add' 
      ? (currentSale.number_of_items || 0) + 1
      : Math.max(0, (currentSale.number_of_items || 1) - 1);
      
    const newTotalPrice = action === 'add'
      ? (currentSale.total_sold_price || 0) + itemPrice
      : Math.max(0, (currentSale.total_sold_price || 0) - itemPrice);
    
    // Update local state
    setLocalSalesTotals(prev => ({
      ...prev,
      [saleId]: { items: newItemCount, total: newTotalPrice }
    }));
    
    // Update sales cache
    queryClient.setQueryData<SaleViewItem[]>(['sales'], old => {
      if (!old) return old;
      return old.map(sale => {
        if (sale.sale_id === saleId) {
          return {
            ...sale,
            number_of_items: newItemCount,
            total_sold_price: newTotalPrice
          };
        }
        return sale;
      });
    });
    
    return { newItemCount, newTotalPrice, itemPrice };
  }, [inventory, availableSales, queryClient]);

  // Simplified handleSaleSelect function
  const handleSaleSelect = async (saleId: number) => {
    if (!inventory) return;
    
    try {
      // Find the selected sale
      const selectedSale = availableSales.find(s => s.sale_id === saleId);
      if (!selectedSale) throw new Error('Sale not found');

      // Update sale totals
      const result = updateSaleTotals(saleId, 'add');
      if (!result) throw new Error('Failed to update sale totals');
      
      // Immediately update form data to show the selected sale
      const updates = {
        sale_id: saleId,
        sale_status: selectedSale.sale_status,
        sale_buyer: selectedSale.buyer_name,
        sale_date: selectedSale.created_at,
        sale_notes: selectedSale.sale_notes || '',
        inventory_status: 'Sold',
        sold_price: result.itemPrice
      };

      // Update all form fields immediately
      Object.entries(updates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });

      // Make the API call
      await updateInventory({
        id: inventory.inventory_id,
        updates: { 
          sale_id: saleId,
          inventory_status: 'Sold'
        }
      });

      // Invalidate related queries to fetch fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['sale_items'] })
      ]);

      notify('success', `${inventory.product_title} added to sale`);
    } catch (error) {
      // Revert all form data on error
      const revertUpdates = {
        sale_id: inventory.sale_id,
        sale_status: inventory.sale_status,
        sale_buyer: inventory.sale_buyer,
        sale_date: inventory.sale_date,
        sale_notes: inventory.sale_notes,
        inventory_status: inventory.inventory_status,
        sold_price: inventory.sold_price
      };

      // Revert all form fields
      Object.entries(revertUpdates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });
      
      // Revert sales cache
      if (inventory.sale_id) {
        updateSaleTotals(inventory.sale_id, 'add');
      }
      if (saleId) {
        updateSaleTotals(saleId, 'remove');
      }

      notify('error', `Failed to add ${inventory.product_title} to sale`);
    }
  };

  // Use this function in the status change button to handle removal from sale
  const handleRemoveFromSale = useCallback(async () => {
    if (!inventory) return;
    
    // Force log to debug
    console.log('handleRemoveFromSale called with sale_id:', formData.sale_id);
    
    try {
      const currentSaleId = formData.sale_id || inventory.sale_id;
      
      if (!currentSaleId) {
        console.log('No sale ID found to remove');
        return;
      }

      // Update sale totals
      updateSaleTotals(currentSaleId, 'remove');
      
      // Clear all sale-related data
      const clearUpdates = {
        sale_id: null,
        sale_status: null,
        sale_buyer: null,
        sale_date: null,
        sale_notes: null,
        sold_price: null,
        inventory_status: 'For Sale'
      };

      // Update all form fields immediately
      Object.entries(clearUpdates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });
      
      // Make the API call
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ 
          sale_id: null,
          inventory_status: 'For Sale'
        })
        .eq('id', inventory.inventory_id);
      
      if (updateError) throw updateError;

      // Update the inventory cache immediately
      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
        if (!old) return old;
        return old.map(item => {
          if (item.inventory_id === inventory.inventory_id) {
            return {
              ...item,
              ...clearUpdates,
              inventory_updated_at: new Date().toISOString()
            };
          }
          return item;
        });
      });

      // Invalidate queries to get fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['sale_items'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] })
      ]);

      notify('success', `${inventory.product_title} removed from sale`);
    } catch (error) {
      console.error('Error removing from sale:', error);
      // Revert on error
      const revertUpdates = {
        sale_id: inventory.sale_id,
        sale_status: inventory.sale_status,
        sale_buyer: inventory.sale_buyer,
        sale_date: inventory.sale_date,
        sale_notes: inventory.sale_notes,
        sold_price: inventory.sold_price,
        inventory_status: inventory.inventory_status
      };

      // Revert form data
      Object.entries(revertUpdates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });

      // Revert totals
      if (inventory.sale_id) {
        updateSaleTotals(inventory.sale_id, 'add');
      }

      notify('error', `Failed to remove ${inventory.product_title} from sale`);
    }
  }, [inventory, formData, handleInputChange, queryClient, updateSaleTotals]);

  // Initialize localSalesTotals on component mount
  useEffect(() => {
    if (availableSales.length > 0) {
      // Create a map of sale ID to item count and total price
      const totalsMap: Record<number, { items: number, total: number }> = {};
      availableSales.forEach(sale => {
        totalsMap[sale.sale_id] = {
          items: sale.number_of_items || 0,
          total: sale.total_sold_price || 0
        };
      });
      setLocalSalesTotals(totalsMap);
    }
  }, [availableSales]);

  // Function to handle purchase selection
  const handlePurchaseSelect = async (purchaseId: number) => {
    if (!inventory) return;
    
    try {
      // Find the selected purchase
      const selectedPurchase = availablePurchases.find(p => p.purchase_id === purchaseId);
      if (!selectedPurchase) throw new Error('Purchase not found');
      
      // Immediately update form data
      const updates = {
        purchase_id: purchaseId,
        purchase_seller: selectedPurchase.seller,
        purchase_origin: selectedPurchase.origin,
        purchase_date: selectedPurchase.purchase_date,
      };
      
      // Update form fields
      Object.entries(updates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });
      
      // Update the API
      await updateInventory({
        id: inventory.inventory_id,
        updates: { purchase_id: purchaseId }
      });
      
      // Update the cache
      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
        if (!old) return old;
        return old.map(item => {
          if (item.inventory_id === inventory.inventory_id) {
            return {
              ...item,
              ...updates,
              inventory_updated_at: new Date().toISOString()
            };
          }
          return item;
        });
      });
      
      notify('success', `${inventory.product_title} connected to purchase`);
    } catch (error) {
      // Revert on error
      handleInputChange('purchase_id', inventory.purchase_id);
      handleInputChange('purchase_seller', inventory.purchase_seller);
      handleInputChange('purchase_origin', inventory.purchase_origin);
      handleInputChange('purchase_date', inventory.purchase_date);
      
      notify('error', `Failed to connect ${inventory.product_title} to purchase`);
    }
  };

  // Function to remove purchase connection
  const handleRemovePurchase = async () => {
    if (!inventory || !inventory.purchase_id) return;
    
    try {
      // Clear purchase data
      const updates = {
        purchase_id: null,
        purchase_seller: null,
        purchase_origin: null,
        purchase_date: null,
        purchase_cost: null
      };
      
      // Update form fields
      Object.entries(updates).forEach(([key, value]) => {
        handleInputChange(key, value);
      });
      
      // Update the API
      await updateInventory({
        id: inventory.inventory_id,
        updates: { purchase_id: null }
      });
      
      // Update the cache
      queryClient.setQueryData<InventoryViewItem[]>(['inventory'], old => {
        if (!old) return old;
        return old.map(item => {
          if (item.inventory_id === inventory.inventory_id) {
            return {
              ...item,
              ...updates,
              inventory_updated_at: new Date().toISOString()
            };
          }
          return item;
        });
      });
      
      notify('success', `${inventory.product_title} disconnected from purchase`);
    } catch (error) {
      // Revert on error
      handleInputChange('purchase_id', inventory.purchase_id);
      handleInputChange('purchase_seller', inventory.purchase_seller);
      handleInputChange('purchase_origin', inventory.purchase_origin);
      handleInputChange('purchase_date', inventory.purchase_date);
      handleInputChange('purchase_cost', inventory.purchase_cost);
      
      notify('error', `Failed to disconnect ${inventory.product_title} from purchase`);
    }
  };

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
            <div className="grid grid-cols-12 gap-4">
              {/* Left Column - Image and Product Info */}
              <div className="col-span-3">
                <div className="space-y-4">
                  <ImageContainerInventory
                    id={inventory?.inventory_id || -1}
                    title={inventory?.product_title || 'New Inventory'}
                    onError={(message) => setErrors(prev => [...prev, message])}
                    className="w-full h-full"
                    productId={inventory?.product_id}
                  />
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="col-span-9 space-y-6">
                {/* Product Information Display */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden shadow-md shadow-black/40">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaBox className="text-cyan-400" />
                      Product Information
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="relative flex">
                      {/* Region Rating Image - Floating Right */}
                      {(() => {
                        const ratingInfo = getRatingDisplayInfo(
                          inventory?.region_name || '', 
                          inventory?.rating_name || '', 
                          regionsData.regions
                        );
                        return ratingInfo && ratingInfo.imagePath ? (
                          <div className="absolute right-0 h-full aspect-square">
                            <img 
                              src={ratingInfo.imagePath} 
                              alt={inventory?.rating_name || ''} 
                              className="h-full w-full object-contain" 
                            />
                          </div>
                        ) : null;
                      })()}

                      {/* Main Content - With right padding for rating image */}
                      <div className="flex-1 pr-[100px]">
                        {/* Group and Type */}
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <FaLayerGroup className="text-indigo-400" />
                          <span>{inventory?.product_group_name || '-'}</span>
                          <span className="mx-2">•</span>
                          <FaCubes className="text-pink-400" />
                          <span>{inventory?.product_type_name || '-'}</span>
                        </div>

                        {/* Title and Variant */}
                        <div className="mb-2">
                          <h4 className="text-xl font-medium text-gray-200">
                            {inventory?.product_title || '-'}
                            {inventory?.product_variant && (
                              <span className="text-gray-400 ml-2">({inventory.product_variant})</span>
                            )}
                          </h4>
                        </div>

                        {/* Region and Year */}
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <FaGlobe className="text-blue-400" />
                          <span>{inventory?.region_name || '-'}</span>
                          <span className="mx-2">•</span>
                          <FaCalendar className="text-yellow-400" />
                          <span>{inventory?.release_year || '-'}</span>
                        </div>

                        {/* Inventory Status Summary */}
                        <div className="text-sm text-gray-300">
                          {(() => {
                            if (!inventory?.total_count) return 'Error loading inventory count';
                            if (inventory.total_count === 1) return 'This is the only entry of this item in inventory';
                            
                            // Group items by status
                            const statusCounts = new Map();
                            if (inventory.normal_count) statusCounts.set('Normal', inventory.normal_count);
                            if (inventory.collection_count) statusCounts.set('Collection', inventory.collection_count);
                            if (inventory.for_sale_count) statusCounts.set('For Sale', inventory.for_sale_count);
                            if (inventory.sold_count) statusCounts.set('Sold', inventory.sold_count);
                            
                            return `${inventory.total_count} total entries: ${Array.from(statusCounts.entries())
                              .map(([status, count]) => `${count} ${status}`)
                              .join(', ')}`;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory Status and Pricing Information Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Status Section */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaBox className="text-blue-400" />
                        Inventory Status
                      </h3>
                    </div>
                    <div className="p-4 relative">
                      {formData.inventory_status === 'Sold' && formData.sale_status === 'Finished' && (
                        <div className="absolute inset-0 z-10 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center rounded-b-lg">
                          <div className="text-2xl font-bold text-gray-300 flex flex-col items-center gap-2">
                            <FaCheck className="w-8 h-8 text-green-400" />
                            ITEM IS SOLD
                          </div>
                        </div>
                      )}
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
                            const isConnectedToSale = Boolean(formData.sale_id);
                            const isDisabled = !isAllowed || isCurrentStatus || (isConnectedToSale && option.status !== 'For Sale');
                          
                          return (
                            <Button
                              key={option.status}
                              type="button"
                              disabled={isDisabled}
                              onClick={async () => {
                                if (!inventory || !isAllowed || isCurrentStatus) return;
                                
                                try {
                                    // If we're changing to For Sale and we have a sale_id (more reliable check)
                                    if (option.status === 'For Sale' && formData.sale_id) {
                                      console.log('Removing from sale...');
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
                    </div>
                  </div>

                  {/* Price Section */}
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
                          (formData.sale_id || inventory?.sale_id) && "opacity-50"
                        )}>
                          <div className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                            <FaDollarSign className="text-green-400 w-3 h-3" />
                            Override
                          </div>
                          <input
                            type="text"
                            className={clsx(
                              "w-full bg-gray-900/50 border border-gray-700 rounded px-2 py-0.5 text-sm text-gray-200",
                              (formData.sale_id || inventory?.sale_id) && "cursor-not-allowed"
                            )}
                            value={formData.override_price ? Math.round(Number(formData.override_price)).toString() : ''}
                            onChange={(e) => {
                              if (formData.sale_id || inventory?.sale_id) return; // Prevent changes if connected to a sale
                              
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
                            disabled={Boolean(formData.sale_id || inventory?.sale_id)}
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
                </div>

                {/* Purchase and Sale Information Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Purchase Information */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden transition-opacity duration-200">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaStore className="text-purple-400" />
                        Purchase Information
                      </h3>
                    </div>
                    <div className="p-4">
                      {inventory?.purchase_id ? (
                        <div className="grid grid-cols-1 gap-4">
                          {/* Connected Purchase Display */}
                          <div className="bg-gradient-to-r from-purple-700/20 to-purple-600/10 rounded-lg p-3 border border-purple-500/20 relative mb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-purple-500/20 p-2 rounded">
                                  <FaStore className="w-4 h-4 text-purple-400" />
                                </div>
                                <div>
                                  <div className="text-gray-200 font-medium flex items-center gap-2">
                                    {formData.purchase_seller || inventory?.purchase_seller || 'No seller name'}
                                    <span className="text-xs text-gray-500">#{formData.purchase_id || inventory?.purchase_id}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <FaCalendar className="w-3 h-3" />
                                      {formData.purchase_date ? new Date(formData.purchase_date).toLocaleDateString('no-NO') : inventory?.purchase_date ? new Date(inventory.purchase_date).toLocaleDateString('no-NO') : '-'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <FaMapMarker className="w-3 h-3" />
                                      {formData.purchase_origin || inventory?.purchase_origin || '-'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <Button
                                onClick={handleRemovePurchase}
                                bgColor="bg-red-900/50"
                                size="sm"
                                className="text-xs"
                              >
                                Disconnect
                              </Button>
                            </div>
                            <div className="absolute -top-3 right-4 bg-gray-800 px-2 py-0.5 text-xs text-purple-400 font-medium rounded">
                              Connected Purchase
                            </div>
                          </div>
                          
                          <FormElement
                            elementType="input"
                            label="Purchase Cost (NOK)"
                            labelIcon={<FaDollarSign />}
                            labelIconColor="text-green-400"
                            initialValue={formData.purchase_cost ? Math.round(Number(formData.purchase_cost)).toString() : ''}
                            onValueChange={(value) => handleInputChange('purchase_cost', value)}
                            numericOnly
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-gray-400 text-sm mb-2">
                            Select a purchase to connect:
                          </div>
                          
                          {/* Purchase Dropdown */}
                          <div className="relative">
                            <Combobox onChange={handlePurchaseSelect}>
                              <div className="relative">
                                <div className="flex">
                                  <Combobox.Input
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Search purchases..."
                                    onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchingPurchases(true)}
                                    onBlur={() => setTimeout(() => setIsSearchingPurchases(false), 200)}
                                  />
                                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                    <FaChevronDown className="w-3 h-3 text-gray-400" />
                                  </Combobox.Button>
                                </div>
                                
                                {isSearchingPurchases && (
                                  <Combobox.Options 
                                    className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto py-1 text-sm"
                                    static
                                  >
                                    {isLoadingPurchases ? (
                                      <div className="px-4 py-2 text-gray-400">Loading purchases...</div>
                                    ) : filteredPurchases.length === 0 ? (
                                      <div className="px-4 py-2 text-gray-400">No purchases found</div>
                                    ) : (
                                      filteredPurchases.map((purchase) => (
                                        <Combobox.Option
                                          key={purchase.purchase_id}
                                          value={purchase.purchase_id}
                                          className={({ active }) =>
                                            `cursor-pointer select-none relative py-2 px-4 ${
                                              active ? 'bg-purple-500/20 text-gray-200' : 'text-gray-300'
                                            }`
                                          }
                                        >
                                          {({ selected, active }) => (
                                            <div className="flex flex-col">
                                              <div className="flex items-center justify-between">
                                                <span className="font-medium">{purchase.seller || 'No seller'}</span>
                                                <span className="text-xs text-gray-400">#{purchase.purchase_id}</span>
                                              </div>
                                              <div className="text-xs text-gray-400 flex items-center gap-4 mt-1">
                                                <span className="flex items-center gap-1">
                                                  <FaCalendar className="w-2 h-2" />
                                                  {purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('no-NO') : '-'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  <FaMapMarker className="w-2 h-2" />
                                                  {purchase.origin || '-'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  <FaBox className="w-2 h-2" />
                                                  {purchase.item_count || 0} items
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </Combobox.Option>
                                      ))
                                    )}
                                  </Combobox.Options>
                                )}
                              </div>
                            </Combobox>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sale Information */}
                  <div className={clsx(
                    "bg-gray-900/50 rounded-lg overflow-hidden transition-all duration-200",
                    formData.inventory_status !== 'For Sale' && !(formData.inventory_status === 'Sold' && formData.sale_status === 'Reserved') && [
                      "opacity-30",
                      "grayscale",
                      "pointer-events-none"
                    ]
                  )}>
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaShoppingCart className="text-orange-400" />
                        Sale Information
                        {formData.inventory_status !== 'For Sale' && !(formData.inventory_status === 'Sold' && formData.sale_status === 'Reserved') && (
                          <span className="text-xs text-gray-500 ml-2">
                            {formData.inventory_status === 'Sold' 
                              ? '(Sale is finalized)' 
                              : '(Set status to For Sale to enable)'}
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="p-4">
                      {(formData.sale_id || (inventory?.sale_id && formData.inventory_status === 'Sold')) ? (
                        <div className="space-y-4">
                          {/* Connected Sale Details */}
                          <div className="bg-gradient-to-r from-green-700/20 to-green-600/10 rounded-lg p-3 border border-green-500/20 relative">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-cyan-500/20 p-2 rounded">
                                  <FaUser className="w-4 h-4 text-cyan-400" />
                                </div>
                                <div>
                                  <div className="text-gray-200 font-medium flex items-center gap-2">
                                    {formData.sale_buyer || inventory?.sale_buyer || 'No buyer name'}
                                    <span className="text-xs text-gray-500">#{formData.sale_id || inventory?.sale_id}</span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                      <FaCalendar className="w-3 h-3" />
                                      {formData.sale_date ? new Date(formData.sale_date).toLocaleDateString('no-NO') : inventory?.sale_date ? new Date(inventory.sale_date).toLocaleDateString('no-NO') : '-'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className={clsx(
                                "px-2 py-1 rounded text-xs font-medium",
                                (formData.sale_status || inventory?.sale_status) === 'Reserved' ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"
                              )}>
                                {formData.sale_status || inventory?.sale_status}
                              </div>
                            </div>
                            <div className="mt-2 pt-2 border-t border-green-500/20">
                              <div className="flex items-center">
                                <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded">
                                  <FaBox className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm text-gray-300">
                                    {(() => {
                                      const saleId = formData.sale_id || inventory?.sale_id;
                                      const currentSale = availableSales.find(s => s.sale_id === saleId);
                                      const localTotal = saleId && localSalesTotals[saleId];
                                      
                                      // Show item count, not the total price
                                      return localTotal?.items || currentSale?.number_of_items || 0;
                                    })()} items
                                  </span>
                                </div>
                                <div className="flex-1 flex justify-end">
                                  <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                                    <FaDollarSign className="w-3 h-3 text-green-400" />
                                    <span className="text-sm text-green-400 font-medium">
                                      Total: NOK {(() => {
                                        const saleId = formData.sale_id || inventory?.sale_id;
                                        const currentSale = availableSales.find(s => s.sale_id === saleId);
                                        const localTotal = saleId && localSalesTotals[saleId];
                                        
                                        // Show the total price
                                        return Math.round(localTotal?.total || currentSale?.total_sold_price || 0);
                                      })()},-
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {(formData.sale_notes || inventory?.sale_notes) && (
                                <div className="mt-2 pt-2 border-t border-green-500/20">
                                  <div className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                                    {formData.sale_notes || inventory?.sale_notes}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-3 right-4 bg-gray-800 px-2 py-0.5 text-xs text-green-400 font-medium rounded">
                              Connected Sale
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {availableSales.length === 0 ? (
                        <div className="text-gray-400 text-sm flex items-center gap-2">
                          <FaExclamationTriangle className="text-yellow-500" />
                              No active sales available
                        </div>
                          ) : (
                            <>
                              <div className={clsx(
                                "grid grid-cols-1 gap-2",
                                formData.inventory_status !== 'For Sale' && "opacity-40 pointer-events-none"
                              )}>
                                {availableSales.map(sale => (
                                  <button
                                    key={sale.sale_id}
                                    onClick={() => handleSaleSelect(sale.sale_id)}
                                    className={clsx(
                                      "w-full text-left",
                                      "bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3",
                                      "border border-gray-700/50",
                                      "transition-all duration-200",
                                      "relative",
                                      "cursor-pointer",
                                      "hover:border-cyan-500/50",
                                      "hover:shadow-lg hover:shadow-cyan-500/10",
                                      "active:scale-[0.98]"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="bg-cyan-500/20 p-2 rounded">
                                          <FaUser className="w-4 h-4 text-cyan-400" />
                    </div>
                                        <div>
                                          <div className="text-gray-200 font-medium">
                                            {sale.buyer_name || 'No buyer name'}
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            Created {new Date(sale.created_at).toLocaleDateString()}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-medium">
                                          Reserved
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded">
                                          <FaBox className="w-3 h-3 text-gray-400" />
                                          <span className="text-sm text-gray-300">
                                            {(() => {
                                              const localTotal = localSalesTotals[sale.sale_id];
                                              // Show item count, not total price
                                              return localTotal?.items || sale.number_of_items || 0;
                                            })()} items
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 text-cyan-400">
                                        <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                                          <FaDollarSign className="w-3 h-3 text-green-400" />
                                          <span className="text-sm text-green-400 font-medium">
                                            NOK {(() => {
                                              const saleId = formData.sale_id || inventory?.sale_id;
                                              const currentSale = availableSales.find(s => s.sale_id === saleId);
                                              const localTotal = saleId && localSalesTotals[saleId];
                                              
                                              // Show the total price
                                              return Math.round(localTotal?.total || currentSale?.total_sold_price || 0);
                                            })()},-
                                          </span>
                                        </div>
                                        <span className="text-sm ml-2">Click to select</span>
                                        <FaChevronRight className="w-3 h-3" />
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Tags Section */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden relative">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaTags className="text-purple-400" />
                      Inventory Tags
                      {(formData.sale_id || inventory?.sale_id) && (
                        <span className="text-xs text-gray-400 ml-2">
                          * Can't change tags while connected to a sale
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="p-4 relative">
                    {/* Loading Overlay */}
                    {isTagPanelProcessing && (
                      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="flex items-center gap-3 text-gray-300">
                          <div className="w-5 h-5 border-b border-current border-t-transparent rounded-full animate-spin" />
                          <span>Processing tags...</span>
                        </div>
                      </div>
                    )}
                    <div className={clsx(
                      "flex flex-wrap gap-2",
                      (formData.sale_id || inventory?.sale_id) && "opacity-70 pointer-events-none"
                    )}>
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
                            isProcessing={isTagProcessing[tag.id]}
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
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-all duration-300" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Card modal className="w-[400px]">
            <Card.Header
              icon={<FaTrash />}
              iconColor="text-red-500"
              title="Delete Inventory Item"
              bgColor="bg-red-500/20"
            />
            <Card.Body>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-gray-300">
                    <span className="text-gray-400">Product:</span> {inventory?.product_title}
                    {inventory?.product_variant && (
                      <span className="text-cyan-500/75"> ({inventory.product_variant})</span>
                    )}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Status:</span> {inventory?.inventory_status}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">ID:</span> {inventory?.inventory_id}
                  </div>
                </div>
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <FaExclamationTriangle />
                  <span>This action cannot be undone.</span>
                </div>
              </div>
            </Card.Body>
            <Card.Footer className="flex justify-end gap-2 bg-gray-900/50">
              <Button
                onClick={() => setIsDeleteConfirmOpen(false)}
                bgColor="bg-gray-700"
                hoverEffect="scale"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                bgColor="bg-red-900/50"
                hoverEffect="scale"
                iconLeft={<FaTrash />}
              >
                Delete
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </Dialog>
    </>
  );
};

export default InventoryModal;
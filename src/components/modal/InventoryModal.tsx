import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { debounce } from 'lodash';
import { FiClock } from 'react-icons/fi';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import regionsData from '@/data/regions.json';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import { notifyTagAction } from '@/utils/notifications';
import { notify } from '@/utils/notifications';
import type { SaleViewItem } from '@/types/sale';
import { BaseStyledContainer } from '@/components/ui/BaseStyledContainer';

// Import extracted components
import { 
  TagButton, 
  StatusButtons, 
  STATUS_OPTIONS, 
  PurchaseItem,
  ProductInfoDisplay,
  PricingSection,
  PurchaseSection,
  SaleSection,
  TagsSection,
  DeleteConfirmDialog,
  ModalFooter,
  ImageSection,
  HeaderSection,
  StatusSection,
  ModalContainer,
  ContentLayout,
  TwoColumnLayout
} from './inventory';

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
  const [isConnectedToSale, setIsConnectedToSale] = useState(false);
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [isSearchingPurchases, setIsSearchingPurchases] = useState(false);

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

  // Replace the purchase query with a version that handles errors gracefully
  const { data: availablePurchases = [], isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('view_purchases')
          .select('*')
          .order('purchase_date', { ascending: false });
        
        if (error) {
          console.warn('Error fetching purchases, the view may not exist:', error.message);
          return []; // Return empty array on error instead of throwing
        }
        
        return data as PurchaseItem[] || [];
      } catch (err) {
        console.warn('Failed to fetch purchases:', err);
        return []; // Return empty array on any error
      }
    },
    // Add retry: false to prevent multiple failed attempts
    retry: false,
    // Add staleTime to prevent frequent refetching of non-existent resource
    staleTime: 1000 * 60 * 5, // 5 minutes
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
      // Set the sale connection state immediately
      setIsConnectedToSale(true);
      
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
      // Revert the sale connection state
      setIsConnectedToSale(Boolean(inventory.sale_id));
      
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
    
    try {
      // Get the current sale ID from either form data or inventory object
      const currentSaleId = formData.sale_id || inventory.sale_id;
      
      if (!currentSaleId) {
        console.log('No sale ID found to remove');
        return;
      }
      
      // Immediately update the sale connection state to re-enable UI elements
      setIsConnectedToSale(false);
      
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
      // Revert on error - also revert the sale connection state
      setIsConnectedToSale(Boolean(inventory.sale_id));
      
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

  // Update the useEffect that tracks connection state
  useEffect(() => {
    // Special case: If status is 'For Sale', force disconnection state
    if (formData.inventory_status === 'For Sale') {
      if (isConnectedToSale) {
        setIsConnectedToSale(false);
      }
      return;
    }
    
    // Normal case: Track connection based on sale_id
    const hasSaleConnection = Boolean(formData.sale_id || inventory?.sale_id);
    setIsConnectedToSale(hasSaleConnection);
  }, [inventory, formData.sale_id, inventory?.sale_id, formData.inventory_status, isConnectedToSale]);

  return (
    <>
      <ModalContainer
        isOpen={isOpen}
        onClose={handleClose}
        inventory={inventory}
        mode={mode}
        rightContent={<HeaderSection inventory={inventory} mode={mode} />}
        footerContent={
          <ModalFooter
            inventory={inventory}
            isUpdating={isUpdating}
            errors={errors}
            isConnectedToSale={isConnectedToSale}
            handleSubmit={handleSubmit}
            handleClose={handleClose}
            handleNavigate={handleNavigate}
            setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
            tableData={tableData}
            onNavigate={onNavigate}
          />
        }
      >
        <ContentLayout
          leftColumn={<ImageSection inventory={inventory} setErrors={setErrors} />}
          rightColumn={
            <>
              <ProductInfoDisplay inventory={inventory} />

              <TwoColumnLayout
                leftColumn={
                  <StatusSection
                    inventory={inventory}
                    formData={formData}
                    isTransitionAllowed={isTransitionAllowed}
                    isConnectedToSale={isConnectedToSale}
                    setIsConnectedToSale={setIsConnectedToSale}
                    handleInputChange={handleInputChange}
                    handleRemoveFromSale={handleRemoveFromSale}
                    updateInventory={updateInventory}
                    setErrors={setErrors}
                  />
                }
                rightColumn={
                  <PricingSection
                    inventory={inventory}
                    formData={formData}
                    isConnectedToSale={isConnectedToSale}
                    handleInputChange={handleInputChange}
                    updateInventory={updateInventory}
                  />
                }
              />

              <TwoColumnLayout
                leftColumn={
                  <PurchaseSection
                    inventory={inventory}
                    formData={formData}
                    availablePurchases={availablePurchases}
                    isLoadingPurchases={isLoadingPurchases}
                    handlePurchaseSelect={handlePurchaseSelect}
                    handleRemovePurchase={handleRemovePurchase}
                    handleInputChange={handleInputChange}
                  />
                }
                rightColumn={
                  <SaleSection
                    inventory={inventory}
                    formData={formData}
                    availableSales={availableSales}
                    isConnectedToSale={isConnectedToSale}
                    localSalesTotals={localSalesTotals}
                    handleSaleSelect={handleSaleSelect}
                    handleInputChange={handleInputChange}
                  />
                }
              />

              <TagsSection
                availableTags={availableTags}
                selectedTags={selectedTags}
                isLoadingTags={isLoadingTags}
                isConnectedToSale={isConnectedToSale}
                isTagPanelProcessing={isTagPanelProcessing}
                isTagProcessing={isTagProcessing}
                handleTagToggle={handleTagToggle}
              />
            </>
          }
        />
      </ModalContainer>

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        inventory={inventory}
      />
    </>
  );
};

export default InventoryModal;
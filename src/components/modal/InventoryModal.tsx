import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { InventoryViewItem } from '@/types/inventory';
import { useInventoryStatusTransitionsCache } from '@/hooks/viewHooks';
import { useInventoryModalState } from '@/hooks/useInventoryModalState';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { TagWithRelationships, TagInfo } from '@/types/tags';
import { debounce } from 'lodash';
import { notify } from '@/utils/notifications';
import type { SaleViewItem } from '@/types/sale';
import { isEqual } from 'lodash';

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
  
  // Use our consolidated state management hook
  const { state, actions, formData } = useInventoryModalState({
    inventory,
    isOpen,
    onClose,
    onSuccess: onUpdateSuccess,
    onNavigate,
    mode
  });
  
  // Extract state and actions for easier access
  const {
    tags: { selected: selectedTags, processing: isTagProcessing, isPanelProcessing: isTagPanelProcessing },
    sales: { isConnected: isConnectedToSale, totals: localSalesTotals },
    purchase: { searchQuery: purchaseSearchQuery, isSearching: isSearchingPurchases },
    delete: { isConfirmOpen: isDeleteConfirmOpen, canDelete },
    form: { isUpdating, errors },
    ui: { pendingImage }
  } = state;
  
  const {
    handleSubmit,
    handleClose,
    handlePendingImageChange,
    handleTagToggle,
    handleDelete,
    updateFormField: handleInputChange,
    setPurchaseSearch,
    setDeleteConfirm,
    updateSaleTotals,
    setSaleConnection
  } = actions;

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
    retry: false,
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
  useEffect(() => {
    if (!isOpen || !inventory || !availableTags.length) return;
    
    const cachedInventory = queryClient
      .getQueryData<InventoryViewItem[]>(['inventory'])
      ?.find(item => item.inventory_id === inventory.inventory_id);

    if (!cachedInventory) return;
    
    // Only use inventory tags, not product tags
    const inventoryTags = cachedInventory.tags || [];

    const newTags = inventoryTags.length > 0
      ? availableTags.filter(tag => inventoryTags.some(t => t.id === tag.id))
      : [];

    // Add deep equality check to prevent unnecessary updates
    if (!isEqual(selectedTags, newTags)) {
      actions.setSelectedTags(newTags);
    }
  }, [isOpen, inventory?.inventory_id, availableTags, queryClient, actions, selectedTags]);

  // Update the useEffect that tracks connection state
  useEffect(() => {
    // Special case: If status is 'For Sale', force disconnection state
    if (formData.inventory_status === 'For Sale') {
      if (isConnectedToSale) {
        setSaleConnection(false);
      }
      return;
    }
    
    // Normal case: Track connection based on sale_id
    const hasSaleConnection = Boolean(formData.sale_id || inventory?.sale_id);
    
    // Only update if the connection state has actually changed
    if (hasSaleConnection !== isConnectedToSale) {
      setSaleConnection(hasSaleConnection);
    }
  }, [inventory?.sale_id, formData.sale_id, formData.inventory_status, isConnectedToSale, setSaleConnection]);

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
      const firstSaleId = Number(Object.keys(totalsMap)[0]);
      updateSaleTotals(firstSaleId, totalsMap[firstSaleId].items, totalsMap[firstSaleId].total);
    }
  }, [availableSales, updateSaleTotals]);

  // Navigation handling
  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
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
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if any modifier key is pressed
      if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

      // Only handle keyboard navigation when not in form elements
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      // Skip if the key is a status shortcut
      const isStatusShortcut = STATUS_OPTIONS.some(opt => opt.shortcut === e.key.toUpperCase());
      if (isStatusShortcut) return;

      if (e.key === 'ArrowLeft') {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigate('next');
      } else if (e.key === 'Delete' && !inventory?.purchase_id && !inventory?.sale_id) {
        e.preventDefault();
        setDeleteConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNavigate, inventory, setDeleteConfirm]);

  // Get available status transitions
  const getAvailableStatusTransitions = useCallback(() => {
    if (!inventory || !transitions) return [];
    
    const currentStatus = inventory.inventory_status;
    const allowedTransitions = transitions[currentStatus] || {};
    
    return Object.keys(allowedTransitions).map(status => ({
      value: status,
      label: status
    }));
  }, [inventory, transitions]);

  // Add this utility function for cleaner code
  const updateSaleTotals2 = useCallback((saleId: number, action: 'add' | 'remove') => {
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
    updateSaleTotals(saleId, newItemCount, newTotalPrice);
    
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
  }, [inventory, availableSales, queryClient, updateSaleTotals]);

  // Simplified handleSaleSelect function
  const handleSaleSelect = async (saleId: number) => {
    if (!inventory) return;
    
    try {
      // Set the sale connection state immediately
      setSaleConnection(true);
      
      // Find the selected sale
      const selectedSale = availableSales.find(s => s.sale_id === saleId);
      if (!selectedSale) throw new Error('Sale not found');

      // Update sale totals
      const result = updateSaleTotals2(saleId, 'add');
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
      const { error } = await supabase
        .from('inventory')
        .update({ 
          sale_id: saleId,
          inventory_status: 'Sold'
        })
        .eq('id', inventory.inventory_id);
        
      if (error) throw error;

      // Invalidate related queries to fetch fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['sale_items'] })
      ]);

      notify('success', `${inventory.product_title} added to sale`);
    } catch (error) {
      // Revert the sale connection state
      setSaleConnection(Boolean(inventory.sale_id));
      
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
        updateSaleTotals2(inventory.sale_id, 'add');
      }
      if (saleId) {
        updateSaleTotals2(saleId, 'remove');
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
      setSaleConnection(false);
      
      // Update sale totals
      updateSaleTotals2(currentSaleId, 'remove');
      
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
      const { error } = await supabase
        .from('inventory')
        .update({ 
          sale_id: null,
          inventory_status: 'For Sale'
        })
        .eq('id', inventory.inventory_id);
      
      if (error) throw error;

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
      setSaleConnection(Boolean(inventory.sale_id));
      
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
        updateSaleTotals2(inventory.sale_id, 'add');
      }

      notify('error', `Failed to remove ${inventory.product_title} from sale`);
    }
  }, [inventory, formData, handleInputChange, queryClient, setSaleConnection, updateSaleTotals2]);

  // Function to handle purchase selection
  const handlePurchaseSelect = async (purchaseId: number | null) => {
    if (!inventory || purchaseId === null) return;
    
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
      const { error } = await supabase
        .from('inventory')
        .update({ purchase_id: purchaseId })
        .eq('id', inventory.inventory_id);
        
      if (error) throw error;
      
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
      const { error } = await supabase
        .from('inventory')
        .update({ purchase_id: null })
        .eq('id', inventory.inventory_id);
        
      if (error) throw error;
      
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

  // Add this after the other hooks
  const debouncedUpdateOverridePrice = useMemo(() => 
    debounce(async (newPrice: string) => {
      if (!inventory) return;
      
      try {
        const { error } = await supabase
          .from('inventory')
          .update({ override_price: newPrice ? Number(newPrice) : null })
          .eq('id', inventory.inventory_id);
          
        if (error) throw error;

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
    [inventory]
  );

  // Add this useEffect after the existing hooks
  useEffect(() => {
    if (isOpen) {
      // Clear any existing errors when modal opens
      actions.setErrors([]);
    }
  }, [isOpen, actions.setErrors]);

  // Add this ref near the top of the component
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add this effect to handle focus after navigation
  useEffect(() => {
    // Focus search input when not viewing a specific item
    if (isOpen && !inventory?.inventory_id) {
      searchInputRef.current?.focus();
    }
  }, [isOpen, inventory?.inventory_id]);

  // Add state to track product tags
  const [productTags, setProductTags] = useState<TagInfo[]>([]);
  
  // Add useEffect to initialize product tags
  useEffect(() => {
    if (!isOpen || !inventory) return;
    
    const cachedInventory = queryClient
      .getQueryData<InventoryViewItem[]>(['inventory'])
      ?.find(item => item.inventory_id === inventory.inventory_id);

    if (cachedInventory?.product_tags) {
      setProductTags(cachedInventory.product_tags);
    } else {
      setProductTags([]);
    }
  }, [isOpen, inventory?.inventory_id, queryClient]);

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
            setIsDeleteConfirmOpen={setDeleteConfirm}
            tableData={tableData}
            onNavigate={onNavigate}
            canDelete={canDelete}
          />
        }
      >
        <ContentLayout
          leftColumn={<ImageSection inventory={inventory} setErrors={actions.setErrors} />}
          rightColumn={
            <>
              <ProductInfoDisplay 
                inventory={inventory} 
                key={`product-info-${inventory?.inventory_id}-${formData.inventory_status}`} 
              />

              <TwoColumnLayout
                leftColumn={
                  <PricingSection
                    inventory={inventory}
                    formData={formData}
                    isConnectedToSale={isConnectedToSale}
                    handleInputChange={handleInputChange}
                    updateInventory={debouncedUpdateOverridePrice}
                  />
                }
              rightColumn={
                  <StatusSection
                    inventory={inventory}
                    formData={formData}
                    isTransitionAllowed={(from, to) => isTransitionAllowed(from, to, inventory?.sale_status || null)}
                    isConnectedToSale={isConnectedToSale}
                    setIsConnectedToSale={setSaleConnection}
                    handleInputChange={handleInputChange}
                    handleRemoveFromSale={handleRemoveFromSale}
                    updateInventory={supabase}
                    setErrors={actions.setErrors}
                    availableSales={availableSales}
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
                    handleRemovePurchase={handleRemovePurchase}
                    handlePurchaseSelect={handlePurchaseSelect}
                    handleInputChange={handleInputChange}
                    setCanDelete={actions.setCanDelete}
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
                productTags={productTags}
              />
            </>
          }
        />
      </ModalContainer>

      <DeleteConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        inventory={inventory}
      />
    </>
  );
};

export default InventoryModal;
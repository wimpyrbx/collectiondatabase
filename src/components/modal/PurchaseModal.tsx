import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { Button, DisplayError } from '@/components/ui';
import { FormElement } from '@/components/formelement/FormElement';
import { PurchaseViewItem } from '@/types/purchase';
import { FaShoppingBag, FaSave, FaTrash, FaPlus, FaUser, FaCalendar, FaMoneyBillWave, FaBoxes, FaGlobe, FaInfoCircle, FaStickyNote, FaExclamationTriangle } from 'react-icons/fa';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/utils/notifications';
import { InventoryViewItem } from '@/types/inventory';
import { BaseStyledContainer } from '@/components/ui/BaseStyledContainer';
import { TooltipWrapper } from '@/components/tooltip/TooltipWrapper';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';
import { getPriceDisplayText, getFinalPrice } from '@/utils/priceUtils';

import { TagWithRelationships } from '@/types/tags';
interface PurchaseModalProps {
  purchase: PurchaseViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (purchaseId: number) => void;
  mode: 'create' | 'edit';
}

// Create a separate component for purchase item rows to properly handle hooks
const PurchaseItemRow: React.FC<{
  item: InventoryViewItem;
  onRemove: (inventoryId: number) => Promise<void>;
}> = ({ item, onRemove }) => {
  const itemRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <tr 
      className="border-b border-gray-700/30 hover:bg-gray-800/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="py-2 px-3">
        <div className="flex items-center gap-3">
          {(item as any).image_url ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 shadow-md shadow-black/30 border border-gray-700/50">
              <img 
                src={(item as any).image_url} 
                alt={item.product_title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/30 border border-gray-700/50">
              <FaBoxes className="text-gray-700 w-5 h-5" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-200 text-sm">
              {item.product_title}
              {item.product_variant && <span className="text-cyan-500/75 ml-1">({item.product_variant})</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.product_type_name}</td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.product_group_name}</td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.region_name}</td>
      <td className="py-2 px-3">
        <div className="text-right font-medium text-indigo-400 text-sm">{getPriceDisplayText(item)}</div>
      </td>
      <td className="py-2 px-3 text-right">
        <div ref={itemRef}>
          <BaseStyledContainer
            as="button"
            bgColor="bg-red-500/50"
            iconLeft={<FaTrash className="w-3 h-3" />}
            size="xs"
            elementProps={{
              type: "button",
              onClick: () => onRemove(item.inventory_id)
            }}
          />
        </div>
      </td>
    </tr>
  );
};

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  purchase,
  isOpen,
  onClose,
  onSuccess,
  mode = 'edit'
}) => {
  const queryClient = useQueryClient();
  
  // Add styles for date input
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .date-input {
        position: relative;
      }
      .date-input::-webkit-calendar-picker-indicator {
        background: transparent;
        bottom: 0;
        color: transparent;
        cursor: pointer;
        height: auto;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
        width: auto;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    seller_name: '',
    origin: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '',
    purchase_notes: ''
  });
  const [purchaseItems, setPurchaseItems] = useState<InventoryViewItem[]>([]);
  const [availableInventory, setAvailableInventory] = useState<InventoryViewItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [initialFormState, setInitialFormState] = useState<any>(null);

  // Initialize form data when purchase changes
  useEffect(() => {
    if (purchase && mode === 'edit') {
      const newFormData = {
        seller_name: purchase.seller_name || '',
        origin: purchase.origin || '',
        purchase_date: purchase.purchase_date ? new Date(purchase.purchase_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        purchase_cost: purchase.purchase_cost ? purchase.purchase_cost.toString() : '',
        purchase_notes: purchase.purchase_notes || ''
      };
      
      setFormData(newFormData);
      setInitialFormState(newFormData);
      setHasFormChanges(false);

      // Fetch purchase items
      fetchPurchaseItems(purchase.purchase_id);
    } else {
      // Reset form for create mode
      const newFormData = {
        seller_name: '',
        origin: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_cost: '',
        purchase_notes: ''
      };
      
      setFormData(newFormData);
      setInitialFormState(newFormData);
      setHasFormChanges(mode === 'create'); // Always enable save for new purchases
      setPurchaseItems([]);
    }

    // Fetch available inventory items
    fetchAvailableInventory();
  }, [purchase, mode, isOpen]);

  // Track form changes
  useEffect(() => {
    if (mode === 'create') return; // Don't track changes for new purchases
    
    if (initialFormState && formData) {
      const compareValues = (initial: any, current: any) => {
        const normalizedInitial = initial === null || initial === undefined ? '' : initial.toString();
        const normalizedCurrent = current === null || current === undefined ? '' : current.toString();
        return normalizedInitial !== normalizedCurrent;
      };

      const hasChanges = Object.keys(initialFormState).some(key => {
        const initial = initialFormState[key];
        const current = formData[key as keyof typeof formData]?.toString() || '';
        return compareValues(initial, current);
      });
      
      if (hasFormChanges !== hasChanges) {
        setHasFormChanges(hasChanges);
      }
    }
  }, [formData, initialFormState, mode, hasFormChanges]);

  const fetchPurchaseItems = async (purchaseId: number) => {
    setIsLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('view_inventory')
        .select('*')
        .eq('purchase_id', purchaseId);
      
      if (error) throw error;
      
      setPurchaseItems(data || []);
    } catch (error) {
      console.error('Error fetching purchase items:', error);
      setErrors(['Failed to load purchase items']);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const fetchAvailableInventory = async () => {
    setIsLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from('view_inventory')
        .select('*')
        .is('purchase_id', null);
      
      if (error) throw error;
      
      setAvailableInventory(data || []);
    } catch (error) {
      console.error('Error fetching available inventory:', error);
      setErrors(['Failed to load available inventory']);
    } finally {
      setIsLoadingInventory(false);
    }
  };

  // Handle input changes
  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      if (mode === 'create') {
        // Create new purchase
        const { data: newPurchase, error: createError } = await supabase
          .from('purchases')
          .insert({
            seller_name: formData.seller_name || null,
            origin: formData.origin || null,
            purchase_date: formData.purchase_date || null,
            purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
            purchase_notes: formData.purchase_notes || null
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        if (newPurchase) {
          notify('success', 'Purchase created successfully');
          onSuccess?.(newPurchase.id);
          onClose();
        }
      } else if (purchase) {
        // Update existing purchase
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            seller_name: formData.seller_name || null,
            origin: formData.origin || null,
            purchase_date: formData.purchase_date || null,
            purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
            purchase_notes: formData.purchase_notes || null
          })
          .eq('id', purchase.purchase_id);
        
        if (updateError) throw updateError;
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        notify('success', 'Purchase updated successfully');
        onSuccess?.(purchase.purchase_id);
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving purchase:', error);
      setErrors([error.message || 'Failed to save purchase']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInventoryItem = async () => {
    if (!selectedInventoryId) {
      setErrors(['Please select an inventory item to add']);
      return;
    }

    if (!purchase && mode === 'edit') {
      setErrors(['Cannot add items to a non-existent purchase']);
      return;
    }

    try {
      if (mode === 'edit' && purchase) {
        // Update inventory with purchase_id
        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({
            purchase_id: purchase.purchase_id
          })
          .eq('id', selectedInventoryId);
        
        if (inventoryError) throw inventoryError;
        
        // Refresh data
        fetchPurchaseItems(purchase.purchase_id);
        fetchAvailableInventory();
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        notify('success', 'Item added to purchase');
        setSelectedInventoryId(null);
      }
    } catch (error: any) {
      console.error('Error adding item to purchase:', error);
      setErrors([error.message || 'Failed to add item to purchase']);
    }
  };

  const handleRemoveInventoryItem = async (inventoryId: number) => {
    if (!purchase) {
      setErrors(['Cannot remove items from a non-existent purchase']);
      return;
    }

    try {
      // Update inventory to remove purchase_id
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          purchase_id: null
        })
        .eq('id', inventoryId);
      
      if (inventoryError) throw inventoryError;
      
      // Refresh data
      fetchPurchaseItems(purchase.purchase_id);
      fetchAvailableInventory();
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Item removed from purchase');
    } catch (error: any) {
      console.error('Error removing item from purchase:', error);
      setErrors([error.message || 'Failed to remove item from purchase']);
    }
  };

  const handleDeletePurchase = async () => {
    if (!purchase) return;
    
    try {
      // First update all inventory items to remove the purchase_id
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ purchase_id: null })
        .eq('purchase_id', purchase.purchase_id);

      if (inventoryError) throw inventoryError;

      // Then delete the purchase
      const { error: purchaseError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchase.purchase_id);

      if (purchaseError) throw purchaseError;

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Purchase deleted successfully');
      onClose();
    } catch (error: any) {
      console.error('Error deleting purchase:', error);
      setErrors([error.message || 'Failed to delete purchase']);
    }
    setIsDeleteConfirmOpen(false);
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((total, item) => {
      return total + (item.purchase_cost || getFinalPrice(item) || 0);
    }, 0);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <Card modal className="w-[900px]">
          <Card.Header
            title={mode === 'create' ? 'Create New Purchase' : `Edit Purchase #${purchase?.purchase_id}`}
            icon={<FaShoppingBag />}
            iconColor="text-indigo-500"
            bgColor="bg-indigo-500/50"
          />
          <Card.Body>
            <div className="min-1[450px] max-h-[500px] overflow-y-auto px-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && <DisplayError errors={errors} />}
                
                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                  {/* Left Column - Purchase Details */}
                  <div className="space-y-6">
                    {/* Header Box */}
                    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                        <h3 className="font-medium text-gray-300 flex items-center gap-2">
                          <FaInfoCircle className="text-indigo-400" />
                          Purchase Details
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormElement
                            elementType="input"
                            label="Seller Name"
                            labelIcon={<FaUser />}
                            labelIconColor="text-indigo-400"
                            initialValue={formData.seller_name}
                            onValueChange={(value) => handleInputChange('seller_name', value)}
                            labelPosition="above"
                            placeholder="Enter seller name"
                          />
                          
                          <FormElement
                            elementType="input"
                            label="Origin"
                            labelIcon={<FaGlobe />}
                            labelIconColor="text-blue-400"
                            initialValue={formData.origin}
                            onValueChange={(value) => handleInputChange('origin', value)}
                            labelPosition="above"
                            placeholder="Enter origin"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormElement
                            elementType="input"
                            label="Purchase Date"
                            labelIcon={<FaCalendar />}
                            labelIconColor="text-yellow-400"
                            initialValue={formData.purchase_date}
                            onValueChange={(value) => handleInputChange('purchase_date', value)}
                            labelPosition="above"
                            className="[&>input]:date-input"
                          />
                          
                          <FormElement
                            elementType="input"
                            label="Purchase Cost"
                            labelIcon={<FaMoneyBillWave />}
                            labelIconColor="text-indigo-400"
                            initialValue={formData.purchase_cost}
                            onValueChange={(value) => handleInputChange('purchase_cost', value)}
                            labelPosition="above"
                            numericOnly
                            placeholder="Enter cost"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Notes */}
                    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                        <h3 className="font-medium text-gray-300 flex items-center gap-2">
                          <FaStickyNote className="text-yellow-400" />
                          Notes
                        </h3>
                      </div>
                      <div className="p-4">
                        <FormElement
                          elementType="textarea"
                          label=""
                          initialValue={formData.purchase_notes}
                          onValueChange={(value) => handleInputChange('purchase_notes', value)}
                          labelPosition="above"
                          placeholder="Enter any notes about this purchase"
                          rows={5}
                        />
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                        <h3 className="font-medium text-gray-300 flex items-center gap-2">
                          <FaBoxes className="text-indigo-400" />
                          Purchase Items
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-500/20 p-2 rounded-lg">
                              <FaBoxes className="text-indigo-400 w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Total Items</div>
                              <div className="text-lg font-semibold text-gray-200">{purchaseItems.length}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-500/20 p-2 rounded-lg">
                              <FaMoneyBillWave className="text-indigo-400 w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Total Cost</div>
                              <div className="text-lg font-semibold text-indigo-400">NOK {calculateTotal().toFixed(0)},-</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Purchase Items & Add Item */}
                  <div className="space-y-4">
                    {/* Add Item Section */}
                    {mode === 'edit' && purchase && (
                      <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                        <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                          <h3 className="font-medium text-gray-300 flex items-center gap-2">
                            <FaPlus className="text-indigo-400" />
                            Add Inventory Item
                          </h3>
                        </div>
                        <div className="p-4">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <FormElement
                                elementType="select"
                                label="Select Item to Add"
                                labelIcon={<FaBoxes />}
                                labelIconColor="text-indigo-400"
                                initialValue={selectedInventoryId?.toString() || ''}
                                onValueChange={(value) => setSelectedInventoryId(Number(value))}
                                labelPosition="above"
                                options={[
                                  { value: '', label: 'Select an item to add...' },
                                  ...availableInventory.map(item => ({
                                    value: item.inventory_id.toString(),
                                    label: `${item.product_title}${item.product_variant ? ` (${item.product_variant})` : ''}`
                                  }))
                                ]}
                                disabled={isLoadingInventory}
                              />
                            </div>
                            <Button
                              type="button"
                              bgColor="bg-indigo-600"
                              iconLeft={<FaPlus className="w-4 h-4" />}
                              onClick={handleAddInventoryItem}
                              disabled={!selectedInventoryId || isLoadingInventory}
                            >
                              Add Item
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="flex flex-col h-[200px]">
                      <div className="bg-gray-900/40 rounded-t-lg p-3 shadow-md shadow-black/20 border border-gray-700/50 border-b-0">
                        <h3 className="text-lg font-medium text-gray-200 flex items-center gap-2">
                          <div className="bg-indigo-500/20 p-2 rounded-lg">
                            <FaBoxes className="text-indigo-400 w-5 h-5" />
                          </div>
                          Purchase Items List
                        </h3>
                      </div>
                      
                      <div className="bg-gray-800/30 rounded-b-lg border border-gray-700/50 overflow-y-auto shadow-inner shadow-black/20 flex-1 min-h-[100px]">
                        {isLoadingItems ? (
                          <div className="p-4 text-center text-gray-400 h-full flex items-center justify-center">
                            <div>
                              <FaBoxes className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-pulse" />
                              <p>Loading purchase items...</p>
                            </div>
                          </div>
                        ) : purchaseItems.length === 0 ? (
                          <div className="p-6 text-center text-gray-400 bg-gray-800/20 rounded-lg border border-dashed border-gray-700/50 h-full flex items-center justify-center">
                            <div>
                              <FaBoxes className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                              <p className="text-lg">No items in this purchase yet</p>
                              <p className="text-sm text-gray-500 mt-2">Use the add item section above to add inventory items</p>
                            </div>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-700/50">
                              <thead className="bg-gray-900/50">
                                <tr>
                                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Group</th>
                                  <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Region</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost</th>
                                  <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                                </tr>
                              </thead>
                              <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                                {purchaseItems.map(item => (
                                  <PurchaseItemRow 
                                    key={item.inventory_id}
                                    item={item}
                                    onRemove={handleRemoveInventoryItem}
                                  />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-between w-full">
              <div>
                {mode === 'edit' && purchase && (
                  <Button
                    type="button"
                    bgColor="bg-red-600"
                    iconLeft={<FaTrash className="w-4 h-4" />}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    Delete Purchase
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  bgColor="bg-gray-700"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  bgColor="bg-indigo-600"
                  iconLeft={<FaSave className="w-4 h-4" />}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !hasFormChanges}
                  className={clsx(
                    "transition-colors duration-200",
                    (!hasFormChanges || isSubmitting) && "opacity-50 bg-gray-800/50 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? 'Saving...' : 'Save Purchase'}
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Modal>

      {/* Delete Confirmation Dialog */}
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
              title="Delete Purchase"
              bgColor="bg-red-500/20"
            />
            <Card.Body>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-gray-300">
                    <span className="text-gray-400">Purchase ID:</span> #{purchase?.purchase_id}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Seller:</span> {purchase?.seller_name || 'N/A'}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Origin:</span> {purchase?.origin || 'N/A'}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Items:</span> {purchaseItems.length}
                  </div>
                </div>
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <FaExclamationTriangle />
                  <span>This action cannot be undone. All items will be disconnected from this purchase.</span>
                </div>
              </div>
            </Card.Body>
            <Card.Footer className="flex justify-end gap-2 bg-gray-900/50">
              <Button
                type="button"
                bgColor="bg-gray-700"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                bgColor="bg-red-900/50"
                iconLeft={<FaTrash />}
                onClick={handleDeletePurchase}
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

export default PurchaseModal; 
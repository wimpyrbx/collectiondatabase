// src/hooks/useInventoryModalState.ts

import React, { useReducer, useCallback, useState, useEffect } from 'react';
import { TagWithRelationships } from '@/types/tags';
import { InventoryViewItem } from '@/types/inventory';
import { useQueryClient } from '@tanstack/react-query';
import { uploadImage, deleteImage } from '@/utils/imageUtils';
import { supabase } from '@/supabaseClient';
import { notify } from '@/utils/notifications';
import { useInventoryTable } from './useInventoryTable';

// State interface
export interface InventoryModalState {
  tags: {
    selected: TagWithRelationships[];
    processing: Record<number, boolean>;
    isPanelProcessing: boolean;
  };
  sales: {
    isConnected: boolean;
    totals: Record<number, { items: number; total: number }>;
  };
  purchase: {
    searchQuery: string;
    isSearching: boolean;
  };
  delete: {
    isConfirmOpen: boolean;
    canDelete: boolean;
  };
  form: {
    data: any;
    isUpdating: boolean;
    errors: string[];
    isDirty: boolean;
  };
  ui: {
    pendingImage: File | null;
  };
}

// Action types - updated to handle function payloads
type InventoryModalAction =
  | { type: 'SET_SELECTED_TAGS'; payload: TagWithRelationships[] }
  | { type: 'SET_TAG_PROCESSING'; payload: { tagId: number; isProcessing: boolean } }
  | { type: 'SET_TAG_PANEL_PROCESSING'; payload: boolean }
  | { type: 'SET_SALE_CONNECTION'; payload: boolean }
  | { type: 'UPDATE_SALE_TOTALS'; payload: { saleId: number; items: number; total: number } }
  | { type: 'SET_PURCHASE_SEARCH'; payload: string }
  | { type: 'SET_PURCHASE_SEARCHING'; payload: boolean }
  | { type: 'SET_DELETE_CONFIRM'; payload: boolean }
  | { type: 'SET_CAN_DELETE'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'SET_ERRORS'; payload: string[] | ((prev: string[]) => string[]) }
  | { type: 'SET_FORM_DATA'; payload: any }
  | { type: 'UPDATE_FORM_FIELD'; payload: { field: string; value: any } }
  | { type: 'SET_PENDING_IMAGE'; payload: File | null }
  | { type: 'SET_FORM_DIRTY'; payload: boolean }
  | { type: 'RESET_STATE'; payload?: { inventory: InventoryViewItem | null } };

// Transform inventory data for the form
const transformInventoryToFormData = (inventory: InventoryViewItem | null) => {
  if (!inventory) {
    return {
      inventory_status: 'Normal',
      override_price: '',
      purchase_seller: '',
      purchase_origin: '',
      purchase_cost: '',
      purchase_date: '',
      purchase_notes: '',
      sale_buyer: '',
      sale_status: '',
      sale_date: '',
      sale_notes: '',
      sold_price: '',
      purchase_id: null,
      sale_id: null
    };
  }

  return {
    inventory_status: inventory.inventory_status,
    override_price: inventory.override_price?.toString() || '',
    purchase_seller: inventory.purchase_seller || '',
    purchase_origin: inventory.purchase_origin || '',
    purchase_cost: inventory.purchase_cost?.toString() || '',
    purchase_date: inventory.purchase_date || '',
    purchase_notes: inventory.purchase_notes || '',
    sale_buyer: inventory.sale_buyer || '',
    sale_status: inventory.sale_status || '',
    sale_date: inventory.sale_date || '',
    sale_notes: inventory.sale_notes || '',
    sold_price: inventory.sold_price?.toString() || '',
    purchase_id: inventory.purchase_id,
    sale_id: inventory.sale_id
  };
};

// Initial state creator function
const createInitialState = (inventory: InventoryViewItem | null): InventoryModalState => ({
  tags: {
    selected: [],
    processing: {},
    isPanelProcessing: false,
  },
  sales: {
    isConnected: Boolean(inventory?.sale_id),
    totals: {},
  },
  purchase: {
    searchQuery: '',
    isSearching: false,
  },
  delete: {
    isConfirmOpen: false,
    canDelete: !inventory?.purchase_id && !inventory?.sale_id,
  },
  form: {
    data: transformInventoryToFormData(inventory),
    isUpdating: false,
    errors: [],
    isDirty: false,
  },
  ui: {
    pendingImage: null,
  },
});

// Reducer - update to handle function payloads
function inventoryModalReducer(
  state: InventoryModalState,
  action: InventoryModalAction
): InventoryModalState {
  switch (action.type) {
    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        tags: {
          ...state.tags,
          selected: action.payload,
        },
      };
    case 'SET_TAG_PROCESSING':
      return {
        ...state,
        tags: {
          ...state.tags,
          processing: {
            ...state.tags.processing,
            [action.payload.tagId]: action.payload.isProcessing,
          },
        },
      };
    case 'SET_TAG_PANEL_PROCESSING':
      return {
        ...state,
        tags: {
          ...state.tags,
          isPanelProcessing: action.payload,
        },
      };
    case 'SET_SALE_CONNECTION':
      return {
        ...state,
        sales: {
          ...state.sales,
          isConnected: action.payload,
        },
      };
    case 'UPDATE_SALE_TOTALS':
      return {
        ...state,
        sales: {
          ...state.sales,
          totals: {
            ...state.sales.totals,
            [action.payload.saleId]: {
              items: action.payload.items,
              total: action.payload.total,
            },
          },
        },
      };
    case 'SET_PURCHASE_SEARCH':
      return {
        ...state,
        purchase: {
          ...state.purchase,
          searchQuery: action.payload,
        },
      };
    case 'SET_PURCHASE_SEARCHING':
      return {
        ...state,
        purchase: {
          ...state.purchase,
          isSearching: action.payload,
        },
      };
    case 'SET_DELETE_CONFIRM':
      return {
        ...state,
        delete: {
          ...state.delete,
          isConfirmOpen: action.payload,
        },
      };
    case 'SET_CAN_DELETE':
      return {
        ...state,
        delete: {
          ...state.delete,
          canDelete: action.payload,
        },
      };
    case 'SET_UPDATING':
      return {
        ...state,
        form: {
          ...state.form,
          isUpdating: action.payload,
        },
      };
    case 'SET_ERRORS':
      return {
        ...state,
        form: {
          ...state.form,
          errors: typeof action.payload === 'function' 
            ? action.payload(state.form.errors) 
            : action.payload,
        },
      };
    case 'SET_FORM_DATA':
      return {
        ...state,
        form: {
          ...state.form,
          data: action.payload,
          isDirty: true,
        },
      };
    case 'UPDATE_FORM_FIELD':
      return {
        ...state,
        form: {
          ...state.form,
          data: {
            ...state.form.data,
            [action.payload.field]: action.payload.value,
          },
          isDirty: true,
        },
      };
    case 'SET_PENDING_IMAGE':
      return {
        ...state,
        ui: {
          ...state.ui,
          pendingImage: action.payload,
        },
      };
    case 'SET_FORM_DIRTY':
      return {
        ...state,
        form: {
          ...state.form,
          isDirty: action.payload,
        },
      };
    case 'RESET_STATE':
      if (action.payload?.inventory) {
        // Reset with new inventory
        // Check if the inventory ID has changed to prevent unnecessary resets
        const currentInventoryId = state.form.data?.inventory_id;
        const newInventoryId = action.payload.inventory.inventory_id;
        
        // Only create a new state if the inventory has changed
        if (currentInventoryId !== newInventoryId) {
          // Deep compare the current inventory data with the new one
          // to prevent unnecessary state resets
          const currentInventoryJSON = JSON.stringify(state.form.data);
          const newInventoryJSON = JSON.stringify(transformInventoryToFormData(action.payload.inventory));
          
          if (currentInventoryJSON !== newInventoryJSON) {
            return createInitialState(action.payload.inventory);
          }
        }
        return state;
      }
      // Reset to empty state
      return createInitialState(null);
    default:
      return state;
  }
}

interface UseInventoryModalStateOptions {
  inventory: InventoryViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inventoryId: number) => void;
  onNavigate?: (inventoryId: number) => void;
  mode?: 'create' | 'edit';
}

export function useInventoryModalState({
  inventory,
  isOpen,
  onClose,
  onSuccess,
  onNavigate,
  mode = 'edit'
}: UseInventoryModalStateOptions) {
  // Memoize the initial state to prevent unnecessary recreations
  const initialState = React.useMemo(() => 
    createInitialState(inventory), [inventory?.inventory_id]
  );
  
  const [state, dispatch] = useReducer(
    inventoryModalReducer, 
    initialState
  );
  
  // Memoize form data to prevent unnecessary re-renders
  const formData = React.useMemo(() => state.form.data, [state.form.data]);
  
  const inventoryTable = useInventoryTable();
  const queryClient = useQueryClient();
  
  // Ref to track the last processed inventory ID to prevent duplicate processing
  const lastProcessedInventoryIdRef = React.useRef<number | null>(null);

  // Initialize state when inventory changes
  useEffect(() => {
    if (isOpen && inventory) {
      // Only reset state if inventory has actually changed and we haven't processed it yet
      const currentInventoryId = state.form.data?.inventory_id;
      const newInventoryId = inventory.inventory_id;
      
      // Skip if we've already processed this inventory ID in this session
      if (currentInventoryId !== newInventoryId && lastProcessedInventoryIdRef.current !== newInventoryId) {
        // Update the ref to mark this inventory as processed
        lastProcessedInventoryIdRef.current = newInventoryId;
        
        // Dispatch the state reset
        dispatch({ 
          type: 'RESET_STATE', 
          payload: { inventory } 
        });
      }
    }
    
    // When modal closes, reset the processed inventory ref
    if (!isOpen) {
      lastProcessedInventoryIdRef.current = null;
    }
  }, [isOpen, inventory?.inventory_id]); // Removed state.form.data from dependencies

  // Handle modal close - defined early so it can be referenced
  const handleClose = useCallback(() => {
    // Reset state and close modal without confirmation
    // and without checking if the form is dirty
    dispatch({ type: 'SET_FORM_DIRTY', payload: false });
    dispatch({ type: 'RESET_STATE' });
    onClose();
  }, [onClose]);

  // Action creators
  const actions = {
    // Tag actions
    setSelectedTags: useCallback((tags: TagWithRelationships[]) => {
      dispatch({ type: 'SET_SELECTED_TAGS', payload: tags });
    }, []),

    setTagProcessing: useCallback((tagId: number, isProcessing: boolean) => {
      dispatch({ type: 'SET_TAG_PROCESSING', payload: { tagId, isProcessing } });
    }, []),

    setTagPanelProcessing: useCallback((isProcessing: boolean) => {
      dispatch({ type: 'SET_TAG_PANEL_PROCESSING', payload: isProcessing });
    }, []),

    // Sales actions
    setSaleConnection: useCallback((isConnected: boolean) => {
      dispatch({ type: 'SET_SALE_CONNECTION', payload: isConnected });
    }, []),

    updateSaleTotals: useCallback((saleId: number, items: number, total: number) => {
      dispatch({ type: 'UPDATE_SALE_TOTALS', payload: { saleId, items, total } });
    }, []),

    // Purchase actions
    setPurchaseSearch: useCallback((query: string) => {
      dispatch({ type: 'SET_PURCHASE_SEARCH', payload: query });
    }, []),

    setPurchaseSearching: useCallback((isSearching: boolean) => {
      dispatch({ type: 'SET_PURCHASE_SEARCHING', payload: isSearching });
    }, []),

    // Delete actions
    setDeleteConfirm: useCallback((isOpen: boolean) => {
      dispatch({ type: 'SET_DELETE_CONFIRM', payload: isOpen });
    }, []),

    setCanDelete: useCallback((canDelete: boolean) => {
      dispatch({ type: 'SET_CAN_DELETE', payload: canDelete });
    }, []),

    // Form actions
    setUpdating: useCallback((isUpdating: boolean) => {
      dispatch({ type: 'SET_UPDATING', payload: isUpdating });
    }, []),

    setErrors: useCallback((errors: string[] | ((prev: string[]) => string[])) => {
      dispatch({ 
        type: 'SET_ERRORS', 
        payload: errors 
      });
    }, []),

    setFormData: useCallback((data: any) => {
      dispatch({ type: 'SET_FORM_DATA', payload: data });
    }, []),

    updateFormField: useCallback((field: string, value: any) => {
      dispatch({ 
        type: 'UPDATE_FORM_FIELD', 
        payload: { field, value } 
      });
    }, []),

    setPendingImage: useCallback((file: File | null) => {
      dispatch({ type: 'SET_PENDING_IMAGE', payload: file });
    }, []),

    setFormDirty: useCallback((isDirty: boolean) => {
      dispatch({ type: 'SET_FORM_DIRTY', payload: isDirty });
    }, []),

    resetState: useCallback(() => {
      dispatch({ type: 'RESET_STATE' });
    }, []),

    // Additional business logic wrapped in actions
    
    // Handle form submission
    handleSubmit: useCallback(async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      
      if (!inventory) return;
      
      try {
        dispatch({ type: 'SET_UPDATING', payload: true });
        
        const formData = state.form.data;
        
        // Prepare inventory updates
        const inventoryUpdates = {
          inventory_status: formData.inventory_status,
          override_price: formData.override_price ? Number(formData.override_price) : null
        };
        
        // Only update purchase if we have a purchase_id
        if (inventory.purchase_id) {
          const purchaseUpdates = {
            seller_name: formData.purchase_seller || null,
            origin: formData.purchase_origin || null,
            purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
            purchase_date: formData.purchase_date || null,
            purchase_notes: formData.purchase_notes || null
          };

          // Update purchase first
          const { error: purchaseError } = await supabase
            .from('purchases')
            .update(purchaseUpdates)
            .eq('id', inventory.purchase_id);

          if (purchaseError) {
            throw purchaseError;
          }
        }
        
        // Update inventory
        await inventoryTable.updateInventory({
          id: inventory.inventory_id,
          updates: inventoryUpdates
        });
        
        // Handle image upload if needed
        if (state.ui.pendingImage) {
          try {
            const { success, message } = await uploadImage(
              'inventory', 
              inventory.inventory_id, 
              state.ui.pendingImage
            );
            
            if (!success) {
              dispatch({ 
                type: 'SET_ERRORS', 
                payload: (prev: string[]) => [...prev, `Image upload failed: ${message}`] 
              });
            } else {
              // Clear the pending image after successful upload
              dispatch({ type: 'SET_PENDING_IMAGE', payload: null });
            }
          } catch (error) {
            dispatch({ 
              type: 'SET_ERRORS', 
              payload: (prev: string[]) => [...prev, 'Failed to upload image'] 
            });
          }
        }
        
        // Reset form dirty state
        dispatch({ type: 'SET_FORM_DIRTY', payload: false });
        
        // Notify success
        notify('success', `${inventory.product_title} updated successfully`);
        
        // Call success callback
        onSuccess?.(inventory.inventory_id);
        
        // Close modal
        handleClose();
      } catch (error) {
        dispatch({ 
          type: 'SET_ERRORS', 
          payload: ['Failed to save changes'] 
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    }, [inventory, state.form.data, state.ui.pendingImage, inventoryTable, onSuccess, handleClose]),
    
    handleClose,
    
    // Handle pending image change with immediate upload
    handlePendingImageChange: useCallback((file: File | null) => {
      dispatch({ type: 'SET_PENDING_IMAGE', payload: file });
      
      // If we have a file and an inventory item, upload it immediately
      if (file && inventory) {
        uploadImage('inventory', inventory.inventory_id, file)
          .then(({ success, message }) => {
            if (!success) {
              dispatch({ 
                type: 'SET_ERRORS', 
                payload: (prev: string[]) => [...prev, `Image upload failed: ${message}`] 
              });
            } else {
              // Clear the pending image after successful upload
              dispatch({ type: 'SET_PENDING_IMAGE', payload: null });
              
              // Update the cache to trigger a re-render
              queryClient.setQueryData(['inventory'], (old: any) => {
                if (!old) return old;
                return old.map((item: any) => {
                  if (item.inventory_id === inventory.inventory_id) {
                    return {
                      ...item,
                      inventory_updated_at: new Date().toISOString()
                    };
                  }
                  return item;
                });
              });
              
              // Notify success
              notify('success', `Image uploaded successfully`);
            }
          })
          .catch(error => {
            dispatch({ 
              type: 'SET_ERRORS', 
              payload: (prev: string[]) => [...prev, 'Failed to upload image'] 
            });
          });
      }
    }, [inventory, queryClient]),
    
    // Handle tag toggle with optimistic updates
    handleTagToggle: useCallback(async (tag: TagWithRelationships) => {
      if (!inventory) return;
      if (state.tags.processing[tag.id]) return;
      
      const isSelected = state.tags.selected.some(t => t.id === tag.id);
      
      // Update local state first (optimistic update)
      dispatch({
        type: 'SET_SELECTED_TAGS',
        payload: isSelected 
          ? state.tags.selected.filter(t => t.id !== tag.id)
          : [...state.tags.selected, tag]
      });
      
      try {
        // Set processing state
        dispatch({ 
          type: 'SET_TAG_PROCESSING', 
          payload: { tagId: tag.id, isProcessing: true } 
        });
        dispatch({ type: 'SET_TAG_PANEL_PROCESSING', payload: true });
        
        if (isSelected) {
          await inventoryTable.removeTag({ 
            inventoryId: inventory.inventory_id, 
            tagId: tag.id 
          });
          notify('remove', 
            React.createElement('span', {}, [
              'Removed ',
              React.createElement('strong', {}, tag.name),
              ' from ',
              inventory.product_title,
              inventory.product_variant ? ` (${inventory.product_variant})` : ''
            ])
          );
        } else {
          await inventoryTable.addTag({ 
            inventoryId: inventory.inventory_id, 
            tagId: tag.id 
          });
          notify('add', 
            React.createElement('span', {}, [
              'Added ',
              React.createElement('strong', {}, tag.name),
              ' to ',
              inventory.product_title,
              inventory.product_variant ? ` (${inventory.product_variant})` : ''
            ])
          );
        }
      } catch (error) {
        // Revert on error (pessimistic revert)
        dispatch({
          type: 'SET_SELECTED_TAGS',
          payload: isSelected 
            ? [...state.tags.selected, tag]
            : state.tags.selected.filter(t => t.id !== tag.id)
        });
        
        notify('error', `Failed to update tag ${tag.name}`);
      } finally {
        // Clear processing state
        dispatch({ 
          type: 'SET_TAG_PROCESSING', 
          payload: { tagId: tag.id, isProcessing: false } 
        });
        dispatch({ type: 'SET_TAG_PANEL_PROCESSING', payload: false });
      }
    }, [inventory, state.tags.selected, state.tags.processing, inventoryTable]),
    
    // Handle inventory deletion
    handleDelete: useCallback(async () => {
      if (!inventory) return;
      
      try {
        dispatch({ type: 'SET_UPDATING', payload: true });
        
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

        // Delete the inventory image if it exists
        try {
        } catch (imageError) {
          console.error('Error deleting inventory image:', imageError);
          // Don't throw here - we still want to continue with the rest of the process
        }

        // Get the current inventory data from cache before removing the deleted item
        const inventoryData = queryClient.getQueryData<InventoryViewItem[]>(['inventory']);
        const deletedItemIndex = inventoryData?.findIndex(item => item.inventory_id === inventory.inventory_id) ?? -1;
        
        // Remove from cache
        queryClient.setQueryData(['inventory'], (old: any) => {
          if (!old) return old;
          return old.filter((item: any) => item.inventory_id !== inventory.inventory_id);
        });

        notify('success', `${inventory.product_title} deleted from inventory`);
        
        // Get the updated inventory data after removing the deleted item
        const updatedInventoryData = queryClient.getQueryData<InventoryViewItem[]>(['inventory']);
        
        // If there are no more items, close the modal
        if (!updatedInventoryData || updatedInventoryData.length === 0) {
          notify('info', 'No more items in inventory');
          onClose();
          return;
        }
        
        // Find the next item to navigate to
        let nextItemIndex = deletedItemIndex;
        // If we're at the end of the list, go to the last item in the updated list
        if (nextItemIndex >= updatedInventoryData.length) {
          nextItemIndex = updatedInventoryData.length - 1;
        }
        
        // Navigate to the next item
        if (nextItemIndex >= 0 && nextItemIndex < updatedInventoryData.length) {
          const nextItem = updatedInventoryData[nextItemIndex];
          if (onNavigate) {
            // Use onNavigate if available
            onNavigate(nextItem.inventory_id);
          } else if (onSuccess) {
            // Fall back to onSuccess if onNavigate is not provided
            onSuccess(nextItem.inventory_id);
          }
        }
      } catch (error) {
        console.error('Error deleting inventory:', error);
        dispatch({
          type: 'SET_ERRORS',
          payload: ['Failed to delete inventory item']
        });
        notify('error', `Failed to delete ${inventory.product_title}`);
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
        dispatch({ type: 'SET_DELETE_CONFIRM', payload: false });
      }
    }, [inventory, queryClient, onClose, onSuccess, onNavigate])
  };

  return { 
    state, 
    actions,
    // For backward compatibility and easier migration
    formData,
    handleInputChange: actions.updateFormField,
    errors: state.form.errors,
    isUpdating: state.form.isUpdating
  };
}

export default useInventoryModalState;
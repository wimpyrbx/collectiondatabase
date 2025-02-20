import { useRef, useCallback, useState } from 'react';
import { useModalForm } from './useModalForm';
import { useInventoryTable } from './useInventoryTable';
import type { InventoryViewItem } from '@/types/inventory';
import { uploadImage } from '@/utils/imageUtils';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

interface UseInventoryModalOptions {
  inventory: InventoryViewItem | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inventoryId: number) => void;
  mode?: 'create' | 'edit';
}

export function useInventoryModal({
  inventory,
  isOpen,
  onClose,
  onSuccess,
  mode = 'edit'
}: UseInventoryModalOptions) {
  const inventoryTable = useInventoryTable();
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Reset all form state
  const resetForm = useCallback(() => {
    setPendingImage(null);
  }, []);

  // Transform inventory data for the form
  const transformInitialData = useCallback((inventory: InventoryViewItem | null) => {
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
        sold_price: ''
      };
    }

    // Reset pending image when editing existing inventory
    setPendingImage(null);

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
      sold_price: inventory.sold_price?.toString() || ''
    };
  }, []);

  const {
    formData,
    errors,
    setErrors,
    handleInputChange,
    handleClose: closeForm
  } = useModalForm({
    initialData: inventory,
    isOpen,
    onClose,
    transform: transformInitialData,
    onReset: resetForm
  });

  const handleClose = useCallback(() => {
    closeForm();
    resetForm();
  }, [closeForm, resetForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'create') {
        setErrors(['Create functionality not implemented yet']);
        return;
      } else if (inventory) {
        // Split data into inventory and purchase updates
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

        // Then update inventory
        await inventoryTable.updateInventory({
          id: inventory.inventory_id,
          updates: inventoryUpdates
        });

        // If we have a pending image, upload it
        if (pendingImage) {
          try {
            const { success, message } = await uploadImage('inventory', inventory.inventory_id, pendingImage);
            if (!success) {
              setErrors(prev => [...prev, `Image upload failed: ${message}`]);
            }
            // Clear the pending image after successful upload
            setPendingImage(null);
          } catch (error) {
            setErrors(prev => [...prev, 'Failed to upload image']);
          }
        }

        onSuccess?.(inventory.inventory_id);
        handleClose();
      }
    } catch (error) {
      setErrors(['Failed to save changes']);
    }
  };

  const handlePendingImageChange = (file: File | null) => {
    setPendingImage(file);
    
    // If we have a file and an inventory item, upload it immediately
    if (file && inventory) {
      uploadImage('inventory', inventory.inventory_id, file)
        .then(({ success, message }) => {
          if (!success) {
            setErrors(prev => [...prev, `Image upload failed: ${message}`]);
          } else {
            // Clear the pending image after successful upload
            setPendingImage(null);
            
            // Update the cache to trigger a re-render
            queryClient.setQueryData<InventoryViewItem[]>(['inventory'], (old: InventoryViewItem[] | undefined) => {
              if (!old) return old;
              return old.map((item: InventoryViewItem) => {
                if (item.inventory_id === inventory.inventory_id) {
                  return {
                    ...item,
                    inventory_updated_at: new Date().toISOString()
                  };
                }
                return item;
              });
            });
          }
        })
        .catch(error => {
          setErrors(prev => [...prev, 'Failed to upload image']);
        });
    }
  };

  return {
    formData,
    errors,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating: inventoryTable.isUpdating,
    setErrors,
    pendingImage,
    handlePendingImageChange
  };
} 
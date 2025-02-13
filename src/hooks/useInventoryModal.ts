import { useRef, useCallback, useState } from 'react';
import { useModalForm } from './useModalForm';
import { useInventoryTable } from './useInventoryTable';
import type { InventoryViewItem } from '@/types/inventory';
import { uploadImage } from '@/utils/imageUtils';

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

  // Reset all form state
  const resetForm = useCallback(() => {
    setPendingImage(null);
  }, []);

  // Transform inventory data for the form
  const transformInitialData = useCallback((inventory: InventoryViewItem | null) => {
    if (!inventory) {
      return {
        inventory_status: 'NORMAL',
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

    // Prepare data
    const data = {
      inventory_status: formData.inventory_status,
      override_price: formData.override_price ? Number(formData.override_price) : null,
      purchase_seller: formData.purchase_seller || null,
      purchase_origin: formData.purchase_origin || null,
      purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : null,
      purchase_date: formData.purchase_date || null,
      purchase_notes: formData.purchase_notes || null,
      sale_buyer: formData.sale_buyer || null,
      sale_status: formData.sale_status || null,
      sale_date: formData.sale_date || null,
      sale_notes: formData.sale_notes || null,
      sold_price: formData.sold_price ? Number(formData.sold_price) : null
    };

    try {
      if (mode === 'create') {
        // TODO: Implement create functionality
        setErrors(['Create functionality not implemented yet']);
        return;
      } else if (inventory) {
        await inventoryTable.updateInventory({
          id: inventory.inventory_id,
          updates: data
        });
      }

      // If we have a pending image, upload it
      if (pendingImage && inventory) {
        try {
          const { success, message } = await uploadImage(pendingImage, 'inventory', inventory.inventory_id);
          if (!success) {
            setErrors(prev => [...prev, `Image upload failed: ${message}`]);
          }
        } catch (error) {
          setErrors(prev => [...prev, 'Failed to upload image']);
        }
      }

      onSuccess?.(inventory!.inventory_id);
      handleClose();
    } catch (error) {
      setErrors(['Failed to save changes']);
    }
  };

  const handlePendingImageChange = (file: File | null) => {
    setPendingImage(file);
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
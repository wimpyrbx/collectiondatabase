import { useState, useEffect } from 'react';
import { canDeleteInventory, type DeletableCheck } from '@/constants/inventory';

export const useInventoryDelete = (inventory: DeletableCheck | null, formData: any) => {
  const [canDelete, setCanDelete] = useState(() => canDeleteInventory(inventory));

  // Update canDelete whenever purchase_id or sale_id changes in either inventory or formData
  useEffect(() => {
    const currentState = {
      purchase_id: formData.purchase_id ?? inventory?.purchase_id,
      sale_id: formData.sale_id ?? inventory?.sale_id
    };
    setCanDelete(canDeleteInventory(currentState));
  }, [
    formData.purchase_id,
    formData.sale_id,
    inventory?.purchase_id,
    inventory?.sale_id
  ]);

  return { canDelete, setCanDelete };
}; 
import React from 'react';
import { InventoryViewItem } from '@/types/inventory';
import { ImageContainerInventory } from '@/components/image/ImageContainerInventory';

interface ImageSectionProps {
  inventory: InventoryViewItem | null;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ inventory, setErrors }) => {
  return (
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
  );
};

export default ImageSection; 
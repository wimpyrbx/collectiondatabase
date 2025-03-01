import React from 'react';
import { InventoryViewItem } from '@/types/inventory';
import { ImageContainerInventory } from '@/components/image/ImageContainerInventory';

interface ImageSectionProps {
  inventory: InventoryViewItem | null;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ inventory, setErrors }) => {
  return (
    <div className="w-full shadow-md shadow-black/30">
      <ImageContainerInventory
        id={inventory?.inventory_id || -1}
        title={inventory?.product_title || 'New Inventory'}
        onError={(message) => setErrors(prev => [...prev, message])}
        className="w-full h-full"
        productId={inventory?.product_id}
      />
    </div>
  );
};

export default ImageSection; 
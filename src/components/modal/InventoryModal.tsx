import React, { useRef, useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { InventoryTagSelector, type InventoryTagSelectorRef } from '@/components/inventory/InventoryTagSelector';
import { FaBox, FaTimes } from 'react-icons/fa';
import { getInventoryWithFallbackUrl } from '@/utils/imageUtils';
import { Button } from '@/components/ui';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';

interface InventoryModalProps {
  inventory: InventoryViewItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  isOpen,
  onClose,
}) => {
  const tagSelectorRef = useRef<InventoryTagSelectorRef>(null);
  const [imageSrc, setImageSrc] = useState<string>('');

  // Handle image loading when modal opens
  useEffect(() => {
    if (isOpen && inventory) {
      setImageSrc(getInventoryWithFallbackUrl(inventory.inventory_id, inventory.product_id));
    }
  }, [isOpen, inventory]);

  // Clear state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setImageSrc(''); // Clear the image
    }
  }, [isOpen]);

  // Handle close with cleanup
  const handleClose = () => {
    setImageSrc(''); // Clear the image immediately
    onClose();
  };

  if (!inventory) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <Card modal>
        <Card.Header 
          title="Inventory Details"
          icon={<FaBox />}
          iconColor="text-cyan-500"
          bgColor="bg-blue-600/50"
          rightContent={`ID: ${inventory.inventory_id}`}
        />
        <div className="absolute top-3 right-12">
          <span className="text-sm text-gray-400">ID: {inventory.inventory_id}</span>
        </div>
        <Card.Body>
          <div className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* Image Column */}
              <div className="col-span-3">
                <div className="aspect-square w-full rounded-lg bg-gray-900/50 border border-gray-700 overflow-hidden">
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt={inventory.product_title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Content Column */}
              <div className="col-span-6 space-y-8">
                {/* Product Info */}
                <div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-100">{inventory.product_title}</h2>
                        {inventory.product_variant && (
                          <p className="text-sm text-cyan-300/80 mt-1">{inventory.product_variant}</p>
                        )}
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                        inventory.inventory_status === 'FOR_SALE' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                        inventory.inventory_status === 'SOLD' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {inventory.inventory_status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-12 gap-x-8 gap-y-6">
                      <div className="col-span-6">
                        {/* Product Type with Icon */}
                        <div className="flex items-center gap-3">
                          {(() => {
                            const typeInfo = getProductTypeInfo(inventory.product_type_name, productTypesData.types);
                            return (
                              <>
                                {typeInfo.imagePath && (
                                  <img
                                    src={typeInfo.imagePath}
                                    alt={typeInfo.displayName}
                                    className="w-6 h-6 object-contain"
                                  />
                                )}
                                <span className="text-sm font-medium text-gray-300">
                                  {typeInfo.displayName}
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        {/* Group */}
                        {inventory.product_group_name && (
                          <div className="mt-3 flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-300">
                              {inventory.product_group_name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="col-span-6">
                        {/* Region */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-300">
                            {(() => {
                              const region = regionsData.regions.find(r => r.name === inventory.region_name);
                              return region?.display_name || inventory.region_name || 'N/A';
                            })()}
                          </span>
                        </div>

                        {/* Rating with Icon */}
                        {inventory.rating_name && (
                          <div className="mt-3">
                            {(() => {
                              const ratingInfo = getRatingDisplayInfo(inventory.region_name, inventory.rating_name, regionsData.regions);
                              return ratingInfo.imagePath && (
                                <img
                                  src={ratingInfo.imagePath}
                                  alt={ratingInfo.displayName}
                                  title={ratingInfo.displayName}
                                  className="h-8 object-contain"
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remove the old status section and keep only the price */}
                {inventory.final_price && (
                  <div className="pt-6 border-t border-gray-800">
                    <div className="flex justify-end items-baseline gap-2">
                      <span className="text-sm text-gray-400">Price:</span>
                      <span className="text-2xl font-semibold text-gray-100">
                        NOK {inventory.final_price.toFixed(0)},-
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Column */}
              <div className="col-span-3">
                <div className="rounded-lg bg-gray-900/50 border border-gray-700 p-4">
                  <InventoryTagSelector
                    key={`tags-${isOpen}-${inventory.inventory_id}`}
                    ref={tagSelectorRef}
                    inventoryId={inventory.inventory_id}
                    productId={inventory.product_id}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-end gap-4">
            <Button
              bgColor="bg-red-900"
              onClick={handleClose}
              iconLeft={<FaTimes />}
            >
              Close
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </Modal>
  );
};
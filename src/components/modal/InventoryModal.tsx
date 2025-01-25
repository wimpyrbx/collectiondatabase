import React, { useRef, useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { InventoryTagSelector, type InventoryTagSelectorRef } from '@/components/inventory/InventoryTagSelector';
import { FaBox, FaTimes, FaStore, FaShoppingCart, FaArchive, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { getInventoryWithFallbackUrl } from '@/utils/imageUtils';
import { Button, DisplayError } from '@/components/ui';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';
import { useInventoryTable } from '@/hooks/useInventoryTable';
import { useInventoryStatusTransitionsCache } from '@/hooks/useInventoryStatusTransitionsCache';
import clsx from 'clsx';

interface InventoryModalProps {
  inventory: InventoryViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess?: (inventoryId: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  isOpen,
  onClose,
  onUpdateSuccess,
}) => {
  const tagSelectorRef = useRef<InventoryTagSelectorRef>(null);
  const [imageSrc, setImageSrc] = useState<string>('');
  const { updateInventory, isUpdating } = useInventoryTable();
  const { isTransitionAllowed } = useInventoryStatusTransitionsCache();
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && inventory) {
      setImageSrc(getInventoryWithFallbackUrl(inventory.inventory_id, inventory.product_id));
      // Get initial available statuses once
      const statuses = [
        inventory.inventory_status,
        ...statusOptions
          .filter(opt => isTransitionAllowed(inventory.inventory_status, opt.status))
          .map(opt => opt.status)
      ];
      setAvailableStatuses(statuses);
      setPendingStatus(null);
      setError(null);
    } else {
      setImageSrc('');
      setPendingStatus(null);
      setError(null);
      setAvailableStatuses([]);
    }
  }, [isOpen, inventory]);

  // Simple keyboard shortcut handler
  const handleKeyPress = (e: KeyboardEvent) => {
    if (!isOpen || !inventory || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const newStatus = {
      'f': 'For Sale',
      'c': 'Collection',
      'n': 'Normal'
    }[e.key.toLowerCase()];

    if (newStatus && availableStatuses.includes(newStatus)) {
      setPendingStatus(newStatus);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, availableStatuses]);

  // Simple status change handler
  const handleStatusChange = (newStatus: string) => {
    if (!inventory || isUpdating) return;
    setPendingStatus(newStatus);
  };

  // Check if there are any pending changes
  const hasChanges = () => {
    return pendingStatus !== null || tagSelectorRef.current?.hasChanges() || false;
  };

  // Handle save changes
  const handleSave = async () => {
    if (!inventory || isUpdating) return;
    setError(null);

    try {
      // Update status if changed
      if (pendingStatus) {
        await updateInventory({
          id: inventory.inventory_id,
          updates: {
            inventory_status: pendingStatus
          }
        });
      }
      
      // Apply tag changes if any
      if (tagSelectorRef.current?.hasChanges()) {
        await tagSelectorRef.current.applyChanges();
      }
      
      onUpdateSuccess?.(inventory.inventory_id);
      handleClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
      setError('Failed to save changes');
    }
  };

  // Handle close with cleanup
  const handleClose = () => {
    setImageSrc('');
    setPendingStatus(null);
    setError(null);
    onClose();
  };

  if (!inventory) return null;

  const currentStatus = pendingStatus || inventory.inventory_status;

  // Status options with their configurations
  const statusOptions = [
    {
      status: 'For Sale',
      label: 'For Sale',
      icon: <FaShoppingCart />,
      shortcut: 'F',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-300',
      hoverBg: 'hover:bg-green-500/30'
    },
    {
      status: 'Collection',
      label: 'Collection',
      icon: <FaArchive />,
      shortcut: 'C',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-300',
      hoverBg: 'hover:bg-purple-500/30'
    },
    {
      status: 'Normal',
      label: 'Normal',
      icon: <FaStore />,
      shortcut: 'N',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-700/30',
      textColor: 'text-gray-300',
      hoverBg: 'hover:bg-gray-500/30'
    },
    {
      status: 'Sold',
      label: 'Sold',
      icon: <FaCheck />,
      shortcut: '',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-300',
      hoverBg: 'hover:bg-blue-500/30'
    }
  ];

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
            {/* Error Display */}
            {error && (
              <DisplayError
                errors={[error]}
                icon={FaExclamationTriangle}
                header="Error"
                bgColor="bg-red-900/30"
                borderColor="border-red-900/50"
                textColor="text-red-200"
              />
            )}

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

              {/* Right Column: Status & Tags */}
              <div className="col-span-3 space-y-4">
                {/* Status Section */}
                <div className="rounded-lg bg-gray-900/50 border border-gray-700 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                    <FaStore className="text-cyan-500" />
                    <span>Status</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {statusOptions
                      .filter(option => availableStatuses.includes(option.status))
                      .map(option => {
                        const isSelected = (pendingStatus || inventory.inventory_status) === option.status;
                        const isCurrentStatus = inventory.inventory_status === option.status;

                        return (
                          <button
                            key={option.status}
                            onClick={() => !isUpdating && !isSelected && handleStatusChange(option.status)}
                            disabled={isUpdating}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg border transition-all duration-200',
                              'flex items-center justify-between',
                              isSelected ? [
                                option.bgColor,
                                option.borderColor,
                                option.textColor,
                                'ring-1 ring-offset-1 ring-offset-gray-900 ring-opacity-60',
                                option.borderColor.replace('border-', 'ring-')
                              ] : [
                                'bg-gray-800/50',
                                'border-gray-700',
                                'text-gray-400',
                                !isUpdating && 'hover:bg-gray-800',
                                !isUpdating && 'hover:border-gray-600'
                              ],
                              isUpdating && 'opacity-50 cursor-not-allowed'
                            )}
                            title={
                              isCurrentStatus ? 'Current status' :
                              option.shortcut ? `Press ${option.shortcut} to select` :
                              undefined
                            }
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-lg">{option.icon}</div>
                              <div className="font-medium whitespace-nowrap">{option.label}</div>
                              {isCurrentStatus && (
                                <div className="text-xs opacity-60 ml-2">(Current)</div>
                              )}
                            </div>
                            {option.shortcut && !isUpdating && !isSelected && (
                              <kbd className="px-1 py-0.5 text-xs rounded bg-black/30">{option.shortcut}</kbd>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Tags Section */}
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
          <div className="flex justify-between gap-4">
            <Button
              bgColor="bg-red-900"
              onClick={handleClose}
              iconLeft={<FaTimes />}
            >
              Close
            </Button>
            <Button
              bgColor="bg-green-900"
              onClick={handleSave}
              iconLeft={<FaCheck />}
              disabled={isUpdating || !hasChanges()}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </Modal>
  );
};
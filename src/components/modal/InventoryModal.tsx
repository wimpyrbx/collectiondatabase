import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { FaBox, FaTimes, FaStore, FaShoppingCart, FaArchive, FaCheck, FaExclamationTriangle, FaDollarSign, FaCalendar, FaUser, FaMapMarker, FaTag } from 'react-icons/fa';
import { getInventoryWithFallbackUrl } from '@/utils/imageUtils';
import { Button } from '@/components/ui';
import { useInventoryStatusTransitionsCache } from '@/hooks/viewHooks';
import { ImageContainer } from '@/components/image/ImageContainer';
import { FormElement } from '@/components/formelement';
import { useInventoryModal } from '@/hooks/useInventoryModal';
import clsx from 'clsx';
import DisplayError from '@/components/ui/DisplayError';
import type { InventoryStatusTransitionMap } from '@/types/inventory_status';

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
  const [imageSrc, setImageSrc] = React.useState<string>('');
  const { transitions, isTransitionAllowed, getRequiredSaleStatus } = useInventoryStatusTransitionsCache();

  const {
    formData,
    errors,
    handleInputChange,
    handleClose,
    handleSubmit,
    isUpdating,
    setErrors,
    pendingImage,
    handlePendingImageChange
  } = useInventoryModal({
    inventory,
    isOpen,
    onClose,
    onSuccess: onUpdateSuccess,
    mode
  });

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen && inventory) {
      setImageSrc(getInventoryWithFallbackUrl(inventory.inventory_id, inventory.product_id));
    } else {
      setImageSrc('');
    }
  }, [isOpen, inventory]);

  // Navigation handling
  const handleNavigate = (direction: 'prev' | 'next') => {
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
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard navigation when not in form elements
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        handleNavigate('prev');
      } else if (e.key === 'ArrowRight') {
        handleNavigate('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory, tableData]);

  // Get available status transitions
  const getAvailableStatusTransitions = () => {
    if (!inventory || !transitions) return [];
    
    const currentStatus = inventory.inventory_status;
    const allowedTransitions = transitions[currentStatus] || {};
    
    return Object.keys(allowedTransitions).map(status => ({
      value: status,
      label: status
    }));
  };

  // Status options with their configurations
  const statusOptions = [
    {
      status: 'FOR_SALE',
      label: 'For Sale',
      icon: <FaShoppingCart />,
      shortcut: 'F',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-300',
      hoverBg: 'hover:bg-green-500/30'
    },
    {
      status: 'COLLECTION',
      label: 'Collection',
      icon: <FaArchive />,
      shortcut: 'C',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-300',
      hoverBg: 'hover:bg-purple-500/30'
    },
    {
      status: 'NORMAL',
      label: 'Normal',
      icon: <FaStore />,
      shortcut: 'N',
      bgColor: 'bg-gray-500/20',
      borderColor: 'border-gray-700/30',
      textColor: 'text-gray-300',
      hoverBg: 'hover:bg-gray-500/30'
    },
    {
      status: 'SOLD',
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
      <form id="inventory-form" onSubmit={handleSubmit}>
        <Card modal>
          <Card.Header
            title={mode === 'create' ? 'New Inventory Item' : 'Edit Inventory Item'}
            icon={<FaBox />}
            iconColor="text-cyan-500"
            bgColor="bg-blue-600/50"
            rightContent={
              <div className="flex items-center gap-4">
                {errors.length > 0 && (
                  <span className="text-red-400 text-sm">{errors.join(', ')}</span>
                )}
                {tableData.length > 0 && onNavigate && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-2 py-1 text-lg text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                      onClick={() => handleNavigate('prev')}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="px-2 py-1 text-lg text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                      onClick={() => handleNavigate('next')}
                    >
                      →
                    </button>
                  </div>
                )}
                {inventory && (
                  <span className="text-sm text-gray-400">
                    ID: {inventory.inventory_id}
                  </span>
                )}
                <button
                  type="button"
                  className="px-2 py-1 text-lg text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-colors"
                  onClick={handleClose}
                >
                  ×
                </button>
              </div>
            }
          />
          <Card.Body>
            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Image and Product Info */}
              <div className="col-span-3">
                <div className="sticky top-0 space-y-4">
                  <ImageContainer
                    type="inventory"
                    id={inventory?.inventory_id || -1}
                    title={inventory?.product_title || 'New Inventory'}
                    className="max-h-[400px]"
                    pendingImage={pendingImage}
                    onPendingImageChange={handlePendingImageChange}
                    isCreateMode={mode === 'create'}
                  />
                  
                  {/* Product Information Display */}
                  <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                      <h3 className="font-medium text-gray-300 flex items-center gap-2">
                        <FaBox className="text-cyan-400" />
                        Product Information
                      </h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                        <span className="text-gray-400">Title:</span>
                        <span className="text-gray-200">{inventory?.product_title || '-'}</span>
                        
                        {inventory?.product_variant && (
                          <>
                            <span className="text-gray-400">Variant:</span>
                            <span className="text-gray-200">{inventory.product_variant}</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">Type:</span>
                        <span className="text-gray-200">{inventory?.product_type_name || '-'}</span>
                        
                        <span className="text-gray-400">Group:</span>
                        <span className="text-gray-200">{inventory?.product_group_name || '-'}</span>
                        
                        {inventory?.release_year && (
                          <>
                            <span className="text-gray-400">Year:</span>
                            <span className="text-gray-200">{inventory.release_year}</span>
                          </>
                        )}
                        
                        <span className="text-gray-400">Region:</span>
                        <span className="text-gray-200">{inventory?.region_name || '-'}</span>
                        
                        <span className="text-gray-400">Rating:</span>
                        <span className="text-gray-200">{inventory?.rating_name || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Form Fields */}
              <div className="col-span-9 space-y-6">
                {/* Status Section */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaBox className="text-blue-400" />
                      Inventory Status
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map(option => {
                        const isCurrentStatus = formData.inventory_status === option.status;
                        const isAllowed = !inventory || isTransitionAllowed(inventory.inventory_status, option.status);

                        return (
                          <button
                            key={option.status}
                            type="button"
                            onClick={() => handleInputChange('inventory_status', option.status)}
                            disabled={!isAllowed}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors',
                              option.bgColor,
                              option.borderColor,
                              option.textColor,
                              isCurrentStatus ? option.bgColor : 'bg-opacity-0',
                              isAllowed ? option.hoverBg : 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            <span className="text-lg">{option.icon}</span>
                            <span>{option.label}</span>
                            {option.shortcut && (
                              <span className="text-xs opacity-50">[{option.shortcut}]</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Price Section */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaDollarSign className="text-green-400" />
                      Pricing Information
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormElement
                        elementType="input"
                        label="Override Price (NOK)"
                        labelIcon={<FaDollarSign />}
                        labelIconColor="text-green-400"
                        initialValue={formData.override_price}
                        onValueChange={(value) => handleInputChange('override_price', value)}
                        numericOnly
                      />
                      <div className="space-y-1 pt-6">
                        <p className="text-sm">
                          <span className="text-gray-400">Base Price:</span>
                          <span className="text-gray-200 ml-2">
                            {inventory?.price_nok_fixed ? `NOK ${inventory.price_nok_fixed},-` : 'N/A'}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-400">Final Price:</span>
                          <span className="text-gray-200 ml-2">
                            {inventory?.final_price ? `NOK ${inventory.final_price},-` : 'N/A'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Information */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaStore className="text-purple-400" />
                      Purchase Information
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormElement
                        elementType="input"
                        label="Seller"
                        labelIcon={<FaUser />}
                        labelIconColor="text-cyan-400"
                        initialValue={formData.purchase_seller}
                        onValueChange={(value) => handleInputChange('purchase_seller', value)}
                      />
                      <FormElement
                        elementType="input"
                        label="Origin"
                        labelIcon={<FaMapMarker />}
                        labelIconColor="text-red-400"
                        initialValue={formData.purchase_origin}
                        onValueChange={(value) => handleInputChange('purchase_origin', value)}
                      />
                      <FormElement
                        elementType="input"
                        label="Purchase Cost (NOK)"
                        labelIcon={<FaDollarSign />}
                        labelIconColor="text-green-400"
                        initialValue={formData.purchase_cost}
                        onValueChange={(value) => handleInputChange('purchase_cost', value)}
                        numericOnly
                      />
                      <FormElement
                        elementType="input"
                        label="Purchase Date"
                        labelIcon={<FaCalendar />}
                        labelIconColor="text-purple-400"
                        initialValue={formData.purchase_date}
                        onValueChange={(value) => handleInputChange('purchase_date', value)}
                      />
                      <div className="col-span-2">
                        <FormElement
                          elementType="textarea"
                          label="Purchase Notes"
                          labelIcon={<FaTag />}
                          labelIconColor="text-yellow-400"
                          initialValue={formData.purchase_notes}
                          onValueChange={(value) => handleInputChange('purchase_notes', value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sale Information */}
                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
                    <h3 className="font-medium text-gray-300 flex items-center gap-2">
                      <FaShoppingCart className="text-orange-400" />
                      Sale Information
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormElement
                        elementType="input"
                        label="Buyer"
                        labelIcon={<FaUser />}
                        labelIconColor="text-cyan-400"
                        initialValue={formData.sale_buyer}
                        onValueChange={(value) => handleInputChange('sale_buyer', value)}
                      />
                      <FormElement
                        elementType="input"
                        label="Sale Status"
                        labelIcon={<FaShoppingCart />}
                        labelIconColor="text-orange-400"
                        initialValue={formData.sale_status}
                        onValueChange={(value) => handleInputChange('sale_status', value)}
                      />
                      <FormElement
                        elementType="input"
                        label="Sold Price (NOK)"
                        labelIcon={<FaDollarSign />}
                        labelIconColor="text-green-400"
                        initialValue={formData.sold_price}
                        onValueChange={(value) => handleInputChange('sold_price', value)}
                        numericOnly
                      />
                      <FormElement
                        elementType="input"
                        label="Sale Date"
                        labelIcon={<FaCalendar />}
                        labelIconColor="text-purple-400"
                        initialValue={formData.sale_date}
                        onValueChange={(value) => handleInputChange('sale_date', value)}
                      />
                      <div className="col-span-2">
                        <FormElement
                          elementType="textarea"
                          label="Sale Notes"
                          labelIcon={<FaTag />}
                          labelIconColor="text-yellow-400"
                          initialValue={formData.sale_notes}
                          onValueChange={(value) => handleInputChange('sale_notes', value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                onClick={handleClose}
                bgColor="bg-gray-700"
                iconLeft={<FaTimes />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                bgColor="bg-blue-600"
                iconLeft={<FaCheck />}
                disabled={isUpdating}
              >
                Save Changes
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </form>
    </Modal>
  );
};

export default InventoryModal;
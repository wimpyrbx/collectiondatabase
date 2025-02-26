import React from 'react';
import { Button } from '@/components/ui';
import { FaChevronLeft, FaChevronRight, FaTrash, FaSave, FaExclamationTriangle } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import clsx from 'clsx';
import DisplayError from '@/components/ui/DisplayError';

interface ModalFooterProps {
  inventory: InventoryViewItem | null;
  isUpdating: boolean;
  errors: string[];
  isConnectedToSale: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleClose: () => void;
  handleNavigate: (direction: 'prev' | 'next') => void;
  setIsDeleteConfirmOpen: (isOpen: boolean) => void;
  tableData: InventoryViewItem[];
  onNavigate?: (inventoryId: number) => void;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  inventory,
  isUpdating,
  errors,
  isConnectedToSale,
  handleSubmit,
  handleClose,
  handleNavigate,
  setIsDeleteConfirmOpen,
  tableData,
  onNavigate
}) => {
  // Only show delete button if product exists and has no purchase or sale connection
  const canDelete = inventory && !inventory.purchase_id && !isConnectedToSale;

  return (
    <div>
      <div className="flex items-center justify-between w-full">
        {/* Left side - Previous and Cancel */}
        <div className="flex gap-2">
          {onNavigate && (
            <Button
              onClick={() => handleNavigate('prev')}
              bgColor="bg-gray-800"
              hoverBgColor={true}
              iconLeft={<FaChevronLeft />}
              disabled={!tableData.length || tableData[0]?.inventory_id === inventory?.inventory_id}
            >
              Previous
            </Button>
          )}
          <Button
            onClick={handleClose}
            bgColor="bg-orange-800"
            hoverBgColor={true}
          >
            Cancel
          </Button>
        </div>

        {/* Center - Delete button or explanation */}
        <div className="flex-1 flex justify-center">
          {canDelete ? (
            <Button
              onClick={() => setIsDeleteConfirmOpen(true)}
              bgColor="bg-red-900/50"
              hoverBgColor={true}
              iconLeft={<FaTrash />}
            >
              Delete
            </Button>
          ) : inventory && (
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <FaExclamationTriangle className="text-yellow-500" />
              Cannot delete - Item has {[
                inventory.purchase_id && 'purchase',
                isConnectedToSale && 'sale'
              ].filter(Boolean).join(' and ')} linked
            </span>
          )}
        </div>

        {/* Right side - Save and Next */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            bgColor="bg-green-600/50"
            hoverBgColor={false}
            iconLeft={<FaSave />}
            disabled={isUpdating}
            className={clsx(
              "transition-colors duration-200",
              isUpdating && "opacity-50 bg-gray-800/50 cursor-not-allowed"
            )}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
          {onNavigate && (
            <Button
              onClick={() => handleNavigate('next')}
              bgColor="bg-gray-800"
              hoverBgColor={true}
              iconRight={<FaChevronRight />}
              disabled={!tableData.length || tableData[tableData.length - 1]?.inventory_id === inventory?.inventory_id}
            >
              Next
            </Button>
          )}
        </div>
      </div>
      {errors.length > 0 && (
        <div className="mt-4">
          <DisplayError errors={errors} />
        </div>
      )}
    </div>
  );
};

export default ModalFooter; 
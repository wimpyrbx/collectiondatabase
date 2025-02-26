import React from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  inventory: InventoryViewItem | null;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  inventory
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-all duration-300" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Card modal className="w-[400px]">
          <Card.Header
            icon={<FaTrash />}
            iconColor="text-red-500"
            title="Delete Inventory Item"
            bgColor="bg-red-500/20"
          />
          <Card.Body>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-gray-300">
                  <span className="text-gray-400">Product:</span> {inventory?.product_title}
                  {inventory?.product_variant && (
                    <span className="text-cyan-500/75"> ({inventory.product_variant})</span>
                  )}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">Status:</span> {inventory?.inventory_status}
                </div>
                <div className="text-gray-300">
                  <span className="text-gray-400">ID:</span> {inventory?.inventory_id}
                </div>
              </div>
              <div className="text-red-400 text-sm flex items-center gap-2">
                <FaExclamationTriangle />
                <span>This action cannot be undone.</span>
              </div>
            </div>
          </Card.Body>
          <Card.Footer className="flex justify-end gap-2 bg-gray-900/50">
            <Button
              onClick={onClose}
              bgColor="bg-gray-700"
              hoverEffect="scale"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              bgColor="bg-red-900/50"
              hoverEffect="scale"
              iconLeft={<FaTrash />}
            >
              Delete
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmDialog; 
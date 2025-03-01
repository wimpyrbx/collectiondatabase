import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui';
import { Card } from '@/components/card';
import { InventoryViewItem } from '@/types/inventory';
import { FaTrash, FaExclamationTriangle, FaTimesCircle, FaSpinner, FaInfoCircle, FaImage } from 'react-icons/fa';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { useQueryClient } from '@tanstack/react-query';
import { checkImageExists } from '@/utils/imageUtils';

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
  // Add loading state to track deletion progress
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasRemainingItems, setHasRemainingItems] = useState(true);
  const [hasImage, setHasImage] = useState(false);
  const queryClient = useQueryClient();

  // Check if there are remaining items in the inventory
  useEffect(() => {
    if (isOpen) {
      const inventoryData = queryClient.getQueryData<InventoryViewItem[]>(['inventory']);
      setHasRemainingItems(Boolean(inventoryData && inventoryData.length > 1));
    }
  }, [isOpen, queryClient]);

  // Check if the inventory item has an image
  useEffect(() => {
    if (isOpen && inventory) {
      const checkForImage = async () => {
        try {
          const exists = await checkImageExists(inventory.inventory_id, 'inventory');
          setHasImage(exists);
        } catch (error) {
          console.error('Error checking for image:', error);
          setHasImage(false);
        }
      };
      
      checkForImage();
    }
  }, [isOpen, inventory]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard shortcuts when deletion is in progress
      if (isDeleting) return;
      
      // Confirm on Enter or Y key
      if (e.key === 'Enter' || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleConfirmDelete();
      }
      // Cancel on Escape key (already handled by Dialog)
      else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onClose, isDeleting]);

  // Focus the delete button when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        // Find the delete button and focus it
        const deleteButton = document.querySelector('button[data-delete-button="true"]');
        if (deleteButton instanceof HTMLButtonElement) {
          deleteButton.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  // Reset deleting state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
    }
  }, [isOpen]);

  // Handle the delete confirmation with loading state
  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await onConfirm();
      
      // After deletion, check if there are any items left
      const updatedInventoryData = queryClient.getQueryData<InventoryViewItem[]>(['inventory']);
      setHasRemainingItems(Boolean(updatedInventoryData && updatedInventoryData.length > 0));
      
      // Note: We don't close the dialog here - the parent component will handle navigation
      // The dialog will remain open until the parent component updates the inventory prop
    } catch (error) {
      console.error('Error during deletion:', error);
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={isDeleting ? () => {} : onClose} // Prevent closing while deleting
      className="relative z-50"
    >
      {/* Backdrop with blur effect */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-all duration-300" aria-hidden="true" />
      
      {/* Dialog container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-[450px] overflow-visible">
          <Card modal className="shadow-xl shadow-black/30 overflow-visible">
            {/* Header */}
            <Card.Header
              icon={<FaTrash />}
              iconColor="text-red-400"
              title={isDeleting ? "Deleting Item..." : "Delete Inventory Item"}
              bgColor="bg-gradient-to-r from-red-800/80 to-red-700/60"
            />
            
            {/* Custom border between header and body */}
            <div className="h-[1px] bg-red-700/50"></div>
            
            {/* Body */}
            <Card.Body className="p-0">
              <div className="p-4 space-y-4 bg-gradient-to-b from-gray-800/90 to-gray-900/95">
                {/* Image and Product Info */}
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="w-[80px] h-[100px] bg-gray-900/80 rounded-md overflow-hidden flex-shrink-0 border border-gray-700/50 shadow-md shadow-black/20">
                    {inventory && (
                      <ImageDisplay
                        type="inventory"
                        id={inventory.inventory_id}
                        title={inventory.product_title}
                        productId={inventory.product_id}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 space-y-2">
                    <div className="text-lg font-medium text-white">
                      {inventory?.product_title}
                      {inventory?.product_variant && (
                        <span className="text-cyan-400/90 text-base ml-1">({inventory.product_variant})</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                      <div className="text-gray-400">Status:</div>
                      <div className="text-gray-200 font-medium">{inventory?.inventory_status}</div>
                      
                      <div className="text-gray-400">ID:</div>
                      <div className="text-gray-200">{inventory?.inventory_id}</div>
                      
                      {inventory?.region_name && (
                        <>
                          <div className="text-gray-400">Region:</div>
                          <div className="text-gray-200">{inventory.region_name}</div>
                        </>
                      )}
                      
                      {inventory?.release_year && (
                        <>
                          <div className="text-gray-400">Year:</div>
                          <div className="text-gray-200">{inventory.release_year}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Warning Message */}
                <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-900/40 rounded-md p-3 text-red-200 text-sm flex items-center gap-3 shadow-inner shadow-black/10">
                  <div className="text-red-400 text-lg flex-shrink-0">
                    {isDeleting && !hasRemainingItems ? <FaInfoCircle /> : <FaExclamationTriangle />}
                  </div>
                  <div>
                    {!isDeleting && (
                      <>
                        <p className="font-medium">This action cannot be undone.</p>
                        <p className="text-red-300/90 text-xs mt-1">
                          Press <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50">Enter</span> or 
                          <span className="bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50 ml-1">Y</span> to confirm.
                        </p>
                        {!hasRemainingItems && (
                          <p className="text-amber-300/90 text-xs mt-1">
                            This is the last item in your inventory. The modal will close after deletion.
                          </p>
                        )}
                      </>
                    )}
                    {isDeleting && (
                      <div className="space-y-1">
                        {hasRemainingItems ? (
                          <p className="text-red-300/90">
                            Deleting item and navigating to next item...
                          </p>
                        ) : (
                          <p className="text-amber-300/90">
                            Deleting the last item in your inventory. The modal will close...
                          </p>
                        )}
                        {hasImage && (
                          <p className="text-cyan-300/90 flex items-center gap-1.5">
                            <FaImage className="text-cyan-400/90" />
                            <span>Removing associated image file...</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card.Body>
            
            {/* Footer */}
            <Card.Footer className="flex justify-between gap-3 bg-gradient-to-b from-red-900/40 to-red-950/60 border-t border-red-900/30 py-3 px-4">
              <Button
                onClick={onClose}
                bgColor="bg-gray-700/80"
                hoverEffect="scale"
                iconLeft={<FaTimesCircle />}
                className="hover:bg-gray-600/80 transition-colors duration-200"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                data-delete-button="true"
                onClick={handleConfirmDelete}
                bgColor="bg-gradient-to-r from-red-700/90 to-red-600/80"
                hoverEffect="scale"
                iconLeft={isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                className="hover:from-red-600/90 hover:to-red-500/80 transition-all duration-200 shadow-md shadow-black/20"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </div>
    </Dialog>
  );
};

export default DeleteConfirmDialog; 
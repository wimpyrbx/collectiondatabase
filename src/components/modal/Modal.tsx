import React from 'react';
import { Dialog } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-7xl'
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md'
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      {/* The backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0">
        {/* Center content vertically and horizontally */}
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal panel with max-height and internal scrolling if needed */}
          <Dialog.Panel 
            className={`
              mx-auto w-full ${sizeClasses[size]} 
              bg-gray-800 rounded-lg shadow-md shadow-black/30
              max-h-[calc(100vh-2rem)] 
              flex flex-col
            `}
          >
            {children}
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};

export default Modal; 
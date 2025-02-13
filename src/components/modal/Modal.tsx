import React from 'react';
import { Dialog } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'w-[800px]',
  xl: 'w-[1024px]',
  // 2xl should be about 75% of the width of the screen, but we need to manually set it without 8xl etc
  '2xl': 'max-w-[calc(100vw-40rem)]'
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
      <div className="fixed inset-0 overflow-visible">
        {/* Center content vertically and horizontally */}
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal panel with max-height and internal scrolling if needed */}
          <div className="relative">
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
      </div>
    </Dialog>
  );
};

export default Modal; 
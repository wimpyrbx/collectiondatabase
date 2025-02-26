import React from 'react';
import { Modal } from '../Modal';
import { Card } from '@/components/card';
import { FaBox } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryViewItem | null;
  mode: 'create' | 'edit';
  rightContent: React.ReactNode;
  children: React.ReactNode;
  footerContent: React.ReactNode;
}

const ModalContainer: React.FC<ModalContainerProps> = ({
  isOpen,
  onClose,
  inventory,
  mode,
  rightContent,
  children,
  footerContent
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Card modal className="w-[1024px]">
        <Card.Header
          icon={<FaBox />}
          iconColor="text-cyan-500"
          title={mode === 'create' ? 'New Inventory Item' : 'Edit Inventory Item'}
          bgColor="bg-cyan-500/50"
          rightContent={rightContent}
        />
        <Card.Body>
          {children}
        </Card.Body>
        <Card.Footer>
          {footerContent}
        </Card.Footer>
      </Card>
    </Modal>
  );
};

export default ModalContainer; 
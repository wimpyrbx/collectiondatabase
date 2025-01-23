import React from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { FaBox, FaTimes, FaCheck } from 'react-icons/fa';
import { Button } from '@/components/ui';

interface DefaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DefaultModal: React.FC<DefaultModalProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <Card>
        <Card.Header
          icon={<FaBox />}
          iconColor="text-blue-500"
          title="Default Modal"
          bgColor="bg-blue-800/50"
        />
        <Card.Body>
            <div className="p-4 text-gray-200">
                Hello World
            </div>
          
            {/* Action Buttons */}
            <div className="flex grid grid-cols-2 gap-2 pt-4 border-t border-gray-700">
                <div>
                    <Button
                        onClick={onClose}
                        bgColor="bg-red-900"
                        iconLeft={<FaTimes />}
                    >
                    Cancel
                    </Button>
                </div>    
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        bgColor="bg-green-900"
                        iconLeft={<FaCheck />}
                    >
                        Save
                    </Button>
                </div>
            </div>
        </Card.Body>
      </Card>
    </Modal>
  );
};

export default DefaultModal; 
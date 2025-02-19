import React, { useState } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { Button } from '@/components/ui';
import { FaCrop, FaSave, FaTimes } from 'react-icons/fa';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (crop: Crop) => Promise<void>;
  type: 'product' | 'inventory';
  id: number;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onSave,
  type,
  id
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5
  });

  const handleSave = async () => {
    try {
      await onSave(crop);
      onClose();
    } catch (error) {
      console.error('Failed to save crop:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Card modal className="w-[1200px]">
        <Card.Header
          icon={<FaCrop />}
          iconColor="text-blue-500"
          title="Crop Image"
          rightContent={
            <Button
              onClick={onClose}
              bgColor="bg-gray-800"
              iconLeft={<FaTimes />}
              type="button"
            >
              Close
            </Button>
          }
        />
        <Card.Body>
          <div className="min-h-[600px] flex items-center justify-center bg-gray-900 rounded-lg p-4">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              aspect={undefined}
            >
              <img
                src={imageUrl}
                alt="Crop preview"
                className="max-h-[550px] object-contain"
              />
            </ReactCrop>
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-end gap-2">
            <Button
              onClick={onClose}
              bgColor="bg-gray-800"
              iconLeft={<FaTimes />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              bgColor="bg-green-600"
              iconLeft={<FaSave />}
            >
              Save Crop
            </Button>
          </div>
        </Card.Footer>
      </Card>
    </Modal>
  );
}; 
import React, { useState, useRef, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { Button } from '@/components/ui';
import { FaEye, FaTimes, FaCrop, FaSave } from 'react-icons/fa';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  enableCrop?: boolean;
  onSave?: (crop: Crop) => Promise<void>;
  type?: 'product' | 'inventory';
  id?: number;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  enableCrop = false,
  onSave,
  type,
  id
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: undefined,
    height: undefined,
    x: undefined,
    y: undefined
  });
  
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = () => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight, width, height } = imgRef.current;
      setImageSize({ width: naturalWidth, height: naturalHeight });
    }
  };

  const handleCropChange = (newCrop: Crop) => {
    setCrop(newCrop);
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return '';
    return Number(num.toFixed(2));
  };

  const endX = crop.x !== undefined && crop.width !== undefined 
    ? formatNumber(crop.x + crop.width) 
    : '';
  const endY = crop.y !== undefined && crop.height !== undefined 
    ? formatNumber(crop.y + crop.height) 
    : '';

  const getActualPixels = () => {
    if (!imageSize || 
        crop.width === undefined || 
        crop.height === undefined || 
        crop.x === undefined || 
        crop.y === undefined) return null;
    
    return {
      startX: Math.round((crop.x / 100) * imageSize.width),
      startY: Math.round((crop.y / 100) * imageSize.height),
      width: Math.round((crop.width / 100) * imageSize.width),
      height: Math.round((crop.height / 100) * imageSize.height),
      endX: Math.round(((crop.x + crop.width) / 100) * imageSize.width),
      endY: Math.round(((crop.y + crop.height) / 100) * imageSize.height)
    };
  };

  const actualPixels = getActualPixels();

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!onSave) return;
    try {
      await onSave(crop);
      onClose();
    } catch (error) {
      console.error('Failed to save crop:', error);
    }
  };

  // Only render CropInfo if we have a valid crop selection
  const hasValidCrop = crop.width !== undefined && 
                      crop.height !== undefined && 
                      crop.x !== undefined && 
                      crop.y !== undefined;

  const CropInfo = () => (
    <div className="absolute top-2 right-2 bg-black/80 p-2 rounded text-xs text-white z-10">
      <div className="grid gap-y-1">
        <div>
          <span className="text-gray-400">Percentage:</span>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <span className="text-gray-400">Start:</span>{' '}
              <span>
                X:{formatNumber(crop.x)} Y:{formatNumber(crop.y)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>{' '}
              <span>
                W:{formatNumber(crop.width)} H:{formatNumber(crop.height)}
              </span>
            </div>
          </div>
        </div>
        {actualPixels && (
          <div>
            <span className="text-gray-400">Pixels:</span>
            <div className="grid grid-cols-2 gap-x-4">
              <div>
                <span className="text-gray-400">Start:</span>{' '}
                <span>X:{actualPixels.startX} Y:{actualPixels.startY}</span>
              </div>
              <div>
                <span className="text-gray-400">Size:</span>{' '}
                <span>W:{actualPixels.width} H:{actualPixels.height}</span>
              </div>
            </div>
          </div>
        )}
        {imageSize && (
          <div className="text-gray-400">
            Image: {imageSize.width}x{imageSize.height}px
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <Card modal className="w-auto h-auto max-w-[95vw] max-h-[95vh]">
        <Card.Header
          icon={enableCrop ? <FaCrop /> : <FaEye />}
          iconColor={enableCrop ? "text-green-500" : "text-blue-500"}
          title={`${enableCrop ? 'Crop' : 'View'} Image: ${title}`}
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
        <Card.Body className="overflow-auto">
          <div className="bg-gray-900 p-8 flex items-center justify-center min-h-[600px]">
            {enableCrop ? (
              <form onSubmit={handleSave} className="relative">
                {hasValidCrop && <CropInfo />}
                <ReactCrop
                  crop={crop}
                  onChange={handleCropChange}
                  aspect={undefined}
                  minWidth={100}
                  minHeight={100}
                >
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt={title}
                    className="max-w-full max-h-full w-auto h-auto"
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </form>
            ) : (
              <img
                src={imageUrl}
                alt={title}
                className="max-w-full max-h-full w-auto h-auto"
              />
            )}
          </div>
        </Card.Body>
        <Card.Footer>
          <div className="flex justify-end gap-2">
            <Button
              onClick={onClose}
              bgColor="bg-gray-800"
              iconLeft={<FaTimes />}
              type="button"
            >
              Cancel
            </Button>
            {enableCrop && onSave && (
              <Button
                onClick={handleSave}
                bgColor="bg-green-600"
                iconLeft={<FaSave />}
                type="submit"
              >
                Save Crop
              </Button>
            )}
          </div>
        </Card.Footer>
      </Card>
    </Modal>
  );
}; 
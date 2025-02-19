import React, { useState, useEffect } from 'react';
import { FaImage, FaTrash, FaUpload, FaTimes, FaCrop, FaEye } from 'react-icons/fa';
import clsx from 'clsx';
import { getProductImageUrl, getInventoryImageUrl, useImageUpload, deleteImage, checkProductImageExists } from '@/utils/imageUtils';
import Button from '../ui/Button';
import BaseStyledContainer from '../ui/BaseStyledContainer';
import { ImageViewer } from '@/components/modal/ImageViewer';
import { type Crop } from 'react-image-crop';

interface ImageContainerProps {
  type: 'product' | 'inventory';
  id: number;
  title: string;
  onError?: (message: string) => void;
  className?: string;
  pendingImage?: File | null;
  onPendingImageChange?: (file: File | null) => void;
  isCreateMode?: boolean;
}

export const ImageContainer: React.FC<ImageContainerProps> = ({
  type,
  id,
  title,
  onError,
  className,
  pendingImage,
  onPendingImageChange,
  isCreateMode
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasRealImage, setHasRealImage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);

  // Use the centralized image upload hook
  const {
    handleDragEnter: onDragEnter,
    handleDragLeave: onDragLeave,
    handleDragOver,
    handleDrop: onDrop,
    handleFileInputChange
  } = useImageUpload(
    type,
    id,
    {
      onUploadStart: () => {
        setIsUploading(true);
      },
      onUploadSuccess: (result) => {
        refreshImage();
      },
      onUploadError: (message: string) => {
        onError?.(message);
      },
      onUploadComplete: () => {
        setIsUploading(false);
      }
    }
  );

  // Wrap the drag handlers to manage the isDragging state
  const handleDragEnter = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragEnter(e);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragLeave(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragging(false);
    onDrop(e);
  };

  const refreshImage = () => {
    const url = type === 'product' 
      ? getProductImageUrl(id)
      : getInventoryImageUrl(id);
    setImageSrc(`${url}&t=${Date.now()}`);

    // Check if a real image exists
    checkProductImageExists(id).then(exists => {
      setHasRealImage(exists);
    });
  };

  // Load image when component mounts or id/type changes
  useEffect(() => {
    if (id) {
      refreshImage();
    }
  }, [id, type]);

  const handleDeleteImage = async () => {
    if (!id || isDeleting) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(true);

    try {
      const result = await deleteImage(type, id);
      
      if (result.success) {
        // Clear the current image and force a reload
        setImageSrc('');
        // Add a small delay before reloading to ensure the old image is cleared
        setTimeout(refreshImage, 100);
      } else {
        onError?.(result.message);
      }
    } catch (error) {
      onError?.('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCropSave = async (crop: Crop) => {
    try {
      // Get the original image dimensions
      const img = document.querySelector(`img[src="${imageSrc}"]`) as HTMLImageElement;
      if (!img) {
        throw new Error('Could not find image element');
      }

      // Convert pixel values to percentages
      const cropPercentages = {
        x: (crop.x / img.naturalWidth) * 100,
        y: (crop.y / img.naturalHeight) * 100,
        width: (crop.width / img.naturalWidth) * 100,
        height: (crop.height / img.naturalHeight) * 100,
        unit: '%'
      };

      const data = {
        type,
        id,
        crop: cropPercentages
      };

      const response = await fetch('http://localhost/api/crop.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.text();

      try {
        const jsonResult = JSON.parse(result);
        if (!jsonResult.success) {
          throw new Error(jsonResult.message);
        }
      } catch (error) {
        throw new Error(`Failed to parse response: ${result}`);
      }

      // Refresh the image to show the cropped version
      refreshImage();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to crop image');
    }
  };

  const openModal = (cropMode: boolean) => {
    setIsCropMode(cropMode);
    setIsModalOpen(true);
  };

  return (
    <>
      <div 
        className={clsx(
          "relative w-full h-[350px] rounded-xl overflow-hidden",
          "bg-gray-900/50 border border-gray-700",
          isDragging && "border-blue-500 border-4",
          "transition-all duration-200",
          "flex items-center justify-center",
          "group",
          className
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isCreateMode ? (
          pendingImage ? (
            <div className="relative w-full h-full">
              <img 
                src={URL.createObjectURL(pendingImage)} 
                alt="Pending upload" 
                className="max-w-full max-h-full object-contain cursor-pointer"
                onClick={() => openModal(false)}
              />
              <button
                onClick={() => onPendingImageChange?.(null)}
                className="absolute top-2 right-2 p-2 bg-red-900/80 rounded-full hover:bg-red-800/80 transition-colors"
              >
                <FaTimes />
              </button>
            </div>
          ) : (
            <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onPendingImageChange?.(file);
                  }
                }}
              />
              <FaUpload className="w-8 h-8 mb-2" />
              <span>Select an image to upload after creation</span>
            </label>
          )
        ) : imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt={title}
              className={clsx(
                "p-5 object-contain w-full h-[350px] cursor-pointer",
                isDragging && "opacity-50"
              )}
              onClick={() => openModal(false)}
              onError={() => setImageSrc('')}
              style={{ objectFit: 'contain' }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <FaImage className="w-12 h-12 mb-2" />
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Upload Overlay - Only show in edit mode */}
        {!isCreateMode && (
          <div 
            className={clsx(
              "absolute inset-0 flex flex-col items-center justify-center",
              "bg-black/50 backdrop-blur-sm",
              "transition-opacity duration-200",
              "z-50",
              isDragging || isUploading ? "opacity-100" : "opacity-0 hover:opacity-100"
            )}
          >
            {isUploading ? (
              <div className="text-blue-400">
                <span>Uploading...</span>
              </div>
            ) : (
              <label className="cursor-pointer text-center flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
                <FaUpload className="w-24 h-24 mb-4 text-gray-100" />
                <span className="text-sm text-gray-300">
                  {isDragging ? 'Drop to upload' : 'Click or drag to upload'}
                </span>
              </label>
            )}
          </div>
        )}

        {/* Action Buttons - Only show in edit mode and when there's an image */}
        {!isCreateMode && hasRealImage && (
          <div className={clsx(
            "absolute bottom-4 left-1/2 -translate-x-1/2",
            "z-[60] flex gap-1",
            "transition-all duration-200",
            "opacity-0 group-hover:opacity-100"
          )}>
            <Button
              onClick={() => openModal(false)}
              bgColor="bg-blue-600/80"
              iconLeft={<FaEye />}
              size="xs"
              className="!px-2 !py-1"
            >
              View
            </Button>
            <Button
              onClick={() => openModal(true)}
              bgColor="bg-green-600/80"
              iconLeft={<FaCrop />}
              size="xs"
              className="!px-2 !py-1"
            >
              Crop
            </Button>
            <Button
              onClick={handleDeleteImage}
              bgColor="bg-red-600/80"
              iconLeft={<FaTrash />}
              size="xs"
              className="!px-2 !py-1"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      {/* Consolidated Modal */}
      <ImageViewer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageSrc}
        title={title}
        enableCrop={isCropMode}
        onSave={handleCropSave}
        type={type}
        id={id}
      />
    </>
  );
}; 
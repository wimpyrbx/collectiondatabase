import React, { useState, useEffect } from 'react';
import { FaImage, FaTrash, FaUpload, FaCrop, FaEye } from 'react-icons/fa';
import clsx from 'clsx';
import { getProductImageUrl, useImageUpload, deleteImage, checkImageExists, invalidateImage } from '@/utils/imageUtils';
import Button from '../ui/Button';
import { ImageViewer } from '@/components/modal/ImageViewer';
import { type Crop } from 'react-image-crop';

interface ImageContainerProductProps {
  id: number;
  title: string;
  onError?: (message: string) => void;
  className?: string;
  pendingImage?: File | null;
  onPendingImageChange?: (file: File | null) => void;
  isCreateMode?: boolean;
}

export const ImageContainerProduct: React.FC<ImageContainerProductProps> = ({
  id,
  title,
  onError,
  className,
  pendingImage,
  onPendingImageChange,
  isCreateMode = false
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasImage, setHasImage] = useState(false);
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
    'product',
    id,
    {
      onUploadStart: () => setIsUploading(true),
      onUploadSuccess: () => refreshImage(),
      onUploadError: (message: string) => onError?.(message),
      onUploadComplete: () => setIsUploading(false)
    }
  );

  const refreshImage = async () => {
    if (id <= 0) return;

    try {
      const exists = await checkImageExists(id, 'product');
      setHasImage(exists);
      setImageSrc(exists ? getProductImageUrl(id) : '');
    } catch (error) {
      console.error('Error refreshing image:', error);
      onError?.('Failed to load image');
    }
  };

  useEffect(() => {
    refreshImage();
  }, [id]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidated = (event: CustomEvent) => {
      const { type, id: invalidatedId } = event.detail;
      if (type === 'product' && invalidatedId === id) {
        refreshImage();
      }
    };

    window.addEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    return () => {
      window.removeEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    };
  }, [id]);

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

  const handleCropSave = async (crop: Crop) => {
    try {
      const img = document.querySelector(`img[src="${imageSrc}"]`) as HTMLImageElement;
      if (!img) throw new Error('Could not find image element');

      const cropPercentages = {
        x: (crop.x / img.naturalWidth) * 100,
        y: (crop.y / img.naturalHeight) * 100,
        width: (crop.width / img.naturalWidth) * 100,
        height: (crop.height / img.naturalHeight) * 100,
        unit: '%'
      };

      const response = await fetch('http://localhost/api/crop.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product', id, crop: cropPercentages })
      });

      const result = await response.text();
      const jsonResult = JSON.parse(result);
      
      if (!jsonResult.success) throw new Error(jsonResult.message);

      invalidateImage('product', id);
      refreshImage();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to crop image');
    }
  };

  const handleDeleteImage = async () => {
    if (!id || isDeleting) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(true);

    try {
      const result = await deleteImage('product', id);
      
      if (result.success) {
        setImageSrc('');
        invalidateImage('product', id);
        refreshImage();
      } else {
        onError?.(result.message);
      }
    } catch (error) {
      onError?.('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
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
        {imageSrc ? (
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={imageSrc}
              alt={title}
              className={clsx(
                "max-w-full max-h-full object-contain p-5",
                isDragging && "opacity-50"
              )}
              onClick={() => setIsModalOpen(true)}
              onError={() => setImageSrc('')}
              style={{ height: '350px', width: '100%', objectFit: 'contain' }}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500">
            <FaImage className="w-12 h-12 mb-2" />
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Upload Overlay */}
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

        {/* Action Buttons */}
        {hasImage && (
          <div className={clsx(
            "absolute bottom-4 left-1/2 -translate-x-1/2",
            "z-[60] flex gap-1",
            "transition-all duration-200",
            "opacity-0 group-hover:opacity-100"
          )}>
            <Button
              onClick={() => {
                setIsCropMode(false);
                setIsModalOpen(true);
              }}
              bgColor="bg-blue-600/80"
              iconLeft={<FaEye />}
              size="xs"
              className="!px-2 !py-1"
            >
              View
            </Button>
            <Button
              onClick={() => {
                setIsCropMode(true);
                setIsModalOpen(true);
              }}
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

      <ImageViewer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageUrl={imageSrc}
        title={title}
        enableCrop={isCropMode}
        onSave={handleCropSave}
        type="product"
        id={id}
      />
    </>
  );
}; 
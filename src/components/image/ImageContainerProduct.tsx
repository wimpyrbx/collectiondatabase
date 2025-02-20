import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  // Constants
  const IMAGE_HEIGHT = 350;
  const IMAGE_CONTAINER_CLASSES = clsx(
    "relative w-full",
    `h-[${IMAGE_HEIGHT}px]`,
    "rounded-xl overflow-hidden",
    "bg-gray-900/50 border border-gray-700",
    "flex items-center justify-center",
    "group",
    className
  );
  const IMAGE_CLASSES = clsx(
    "max-w-full max-h-full object-contain p-5",
    "transition-opacity duration-200"
  );

  // State
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);

  // Memoize the image style to prevent recreating object on every render
  const imageStyle = useMemo(() => ({
    height: `${IMAGE_HEIGHT}px`,
    width: '100%',
    objectFit: 'contain' as const
  }), [IMAGE_HEIGHT]);

  // Memoize handlers to prevent recreating functions on every render
  const handleImageError = useCallback(() => setImageSrc(''), []);
  const handleImageClick = useCallback(() => setIsModalOpen(true), []);

  // Use the centralized image upload hook
  const {
    handleDragEnter: onDragEnter,
    handleDragLeave: onDragLeave,
    handleDragOver,
    handleDrop: onDrop,
    handleFileInputChange: baseHandleFileInputChange
  } = useImageUpload(
    'product',
    id,
    {
      onUploadStart: () => {
        setIsUploading(true);
        if (isCreateMode && onPendingImageChange) {
          onPendingImageChange(null);
        }
      },
      onUploadSuccess: () => {
        if (!isCreateMode) {
          refreshImage();
        }
      },
      onUploadError: (message: string) => onError?.(message),
      onUploadComplete: () => setIsUploading(false)
    }
  );

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isCreateMode && onPendingImageChange) {
      onPendingImageChange(file);
      return;
    }

    baseHandleFileInputChange(e);
  }, [isCreateMode, onPendingImageChange, baseHandleFileInputChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (isCreateMode && onPendingImageChange) {
      onPendingImageChange(file);
      return;
    }

    onDrop(e);
  }, [isCreateMode, onPendingImageChange, onDrop]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    setIsDragging(true);
    onDragEnter(e);
  }, [onDragEnter]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setIsDragging(false);
    onDragLeave(e);
  }, [onDragLeave]);

  // Combine image source management effects
  useEffect(() => {
    if (pendingImage) {
      const url = URL.createObjectURL(pendingImage);
      setImageSrc(url);
      setHasImage(true);
      return () => URL.revokeObjectURL(url);
    } else if (id > 0) {
      const checkImage = async () => {
        try {
          const exists = await checkImageExists(id, 'product');
          setHasImage(exists);
          setImageSrc(exists ? getProductImageUrl(id) : '');
        } catch (error) {
          console.error('Error refreshing image:', error);
          onError?.('Failed to load image');
        }
      };
      checkImage();
    }
  }, [id, pendingImage, onError]);

  // Cache invalidation listener
  useEffect(() => {
    const handleCacheInvalidated = (event: CustomEvent) => {
      const { type, id: invalidatedId } = event.detail;
      if (type === 'product' && invalidatedId === id && !pendingImage) {
        refreshImage();
      }
    };

    window.addEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    return () => {
      window.removeEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    };
  }, [id, pendingImage]);

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

  const handleCropSave = useCallback(async (crop: Crop) => {
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
  }, [id, imageSrc, onError]);

  const handleDeleteImage = useCallback(async () => {
    if (!id || isDeleting) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;

    setIsDeleting(true);

    try {
      const result = await deleteImage('product', id);
      
      if (result.success) {
        setHasImage(false);
        setImageSrc('');
        invalidateImage('product', id);
      } else {
        onError?.(result.message);
      }
    } catch (error) {
      onError?.('Failed to delete image');
    } finally {
      setIsDeleting(false);
    }
  }, [id, isDeleting, onError]);

  const handleCropClick = useCallback(() => {
    setIsCropMode(true);
    setIsModalOpen(true);
  }, []);

  const handleViewClick = useCallback(() => {
    setIsCropMode(false);
    setIsModalOpen(true);
  }, []);

  return (
    <>
      <div 
        className={clsx(
          IMAGE_CONTAINER_CLASSES,
          isDragging && "border-green-600/50 border-4"
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
                IMAGE_CLASSES,
                isDragging && "opacity-50"
              )}
              onClick={handleImageClick}
              onError={handleImageError}
              style={imageStyle}
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
            "absolute bottom-0 p-4 left-1/2 -translate-x-1/2",
            "z-[60] flex gap-4",
            "transition-all duration-200",
            "opacity-0 group-hover:opacity-100 items-center justify-center w-full bg-gradient-to-t from-black/100 to-transparent",
            "animate-in fade-in-0 duration-500"
          )}>
            <Button
              onClick={handleViewClick}
              bgColor="bg-blue-600/80"
              iconLeft={<FaEye />}
              hoverEffect='scale'
              size="xs"
            >
              View
            </Button>
            <Button
              onClick={handleCropClick}
              bgColor="bg-green-600/80"
              iconLeft={<FaCrop />}
              size="xs"
              hoverEffect='scale'
            >
              Crop
            </Button>
            <Button
              onClick={handleDeleteImage}
              bgColor="bg-red-600/80"
              iconLeft={<FaTrash />}
              size="xs"
              disabled={isDeleting}
              hoverEffect='scale'
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
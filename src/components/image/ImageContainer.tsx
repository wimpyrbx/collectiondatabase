import React, { useState, useEffect } from 'react';
import { FaImage, FaTrash, FaUpload, FaTimes } from 'react-icons/fa';
import clsx from 'clsx';
import { getProductImageUrl, getInventoryImageUrl, useImageUpload, deleteImage, checkProductImageExists } from '@/utils/imageUtils';
import Button from '../ui/Button';
import BaseStyledContainer from '../ui/BaseStyledContainer';

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

  return (
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
              className="max-w-full max-h-full object-contain"
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
              "p-5 object-contain w-full h-[350px]",
              isDragging && "opacity-50"
            )}
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

      {/* Delete Button - Only show in edit mode and when there's a real image */}
      {!isCreateMode && hasRealImage && (
        <Button
          onClick={handleDeleteImage}
          disabled={isDeleting}
          bgColor="bg-red-700/80"
          hoverBgColor={true}
          iconLeft={<FaTrash />}
          className={clsx(
            "absolute left-1/2 -translate-x-1/2 bottom-4",
            "z-[60]",
            "transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            isDeleting && "opacity-50 cursor-not-allowed"
          )}
        >
          Delete
        </Button>
      )}
    </div>
  );
}; 
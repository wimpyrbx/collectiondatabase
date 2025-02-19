import React, { useState, useEffect } from 'react';
import { FaImage } from 'react-icons/fa';
import { getProductImageUrl, getInventoryImageUrl, getImageCacheKey } from '@/utils/imageUtils';
import clsx from 'clsx';

interface ImageDisplayProps {
  type: 'product' | 'inventory';
  id: number;
  title: string;
  className?: string;
  placeholderClassName?: string;
  containerClassName?: string;
  showTooltip?: boolean;
  tooltipClassName?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  type,
  id,
  title,
  className,
  placeholderClassName,
  containerClassName,
  showTooltip = false,
  tooltipClassName
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTooltipImage, setShowTooltipImage] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageVersion, setImageVersion] = useState(Date.now());

  const imageUrl = type === 'product' 
    ? getProductImageUrl(id)
    : getInventoryImageUrl(id);

  // Reset states when id or type changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setImageVersion(Date.now());
  }, [id, type]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidated = (event: CustomEvent<{ key: string }>) => {
      const ourKey = getImageCacheKey(type, id);
      if (event.detail.key === ourKey) {
        // Force a re-render of the image
        setImageVersion(Date.now());
        setIsLoading(true);
        setHasError(false);
      }
    };

    window.addEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    return () => {
      window.removeEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    };
  }, [type, id]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!showTooltip) return;
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  // Show placeholder if there's an error
  if (hasError) {
    return (
      <div className={clsx(containerClassName, "h-full flex items-center justify-center")}>
        <FaImage className={clsx("text-gray-500", placeholderClassName)} />
      </div>
    );
  }

  const finalImageUrl = `${imageUrl}&v=${imageVersion}`;

  return (
    <div className={clsx(containerClassName, "h-full")}>
      <img
        key={finalImageUrl}
        src={finalImageUrl}
        alt={title}
        className={clsx(
          "h-full w-full object-contain",
          className,
          isLoading && 'opacity-0'
        )}
        onLoad={handleLoad}
        onError={handleError}
        onMouseEnter={() => setShowTooltipImage(true)}
        onMouseLeave={() => setShowTooltipImage(false)}
        onMouseMove={handleMouseMove}
        data-image-key={getImageCacheKey(type, id)}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700/50">
          <FaImage className={clsx("text-gray-500", placeholderClassName)} />
        </div>
      )}
      {showTooltip && showTooltipImage && !isLoading && (
        <div 
          className={clsx(
            "fixed z-50 pointer-events-none",
            "bg-gray-800/95 p-3 rounded-lg",
            "border border-gray-600/50",
            "shadow-xl shadow-black/50",
            "absolute",
            tooltipClassName
          )}
          style={{
            left: '100%',
            top: '50%',
            marginLeft: '1rem',
            transform: 'translateY(-50%)'
          }}
        >
          <img
            src={finalImageUrl}
            alt={title}
            className={className}
            data-image-key={getImageCacheKey(type, id)}
          />
        </div>
      )}
    </div>
  );
}; 
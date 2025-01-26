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
  showTooltip?: boolean;
  tooltipClassName?: string;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  type,
  id,
  title,
  className,
  placeholderClassName,
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
    return <FaImage className={clsx("text-gray-500", placeholderClassName)} />;
  }

  const finalImageUrl = `${imageUrl}&v=${imageVersion}`;

  return (
    <>
      <img
        key={finalImageUrl} // Force React to create a new img element
        src={finalImageUrl}
        alt={title}
        className={clsx(
          className,
          isLoading && 'invisible' // Hide while loading but keep space
        )}
        onLoad={handleLoad}
        onError={handleError}
        onMouseEnter={() => setShowTooltipImage(true)}
        onMouseLeave={() => setShowTooltipImage(false)}
        onMouseMove={handleMouseMove}
        data-image-key={getImageCacheKey(type, id)}
      />
      {showTooltip && showTooltipImage && !isLoading && (
        <div 
          className={clsx(
            "fixed z-50 pointer-events-none",
            "bg-gray-700/90 p-4 rounded-lg shadow-lg",
            "border border-gray-500/50",
            tooltipClassName
          )}
          style={{
            left: mousePosition.x + 20,
            top: mousePosition.y + 20,
            transform: 'translate(0, -50%)'
          }}
        >
          <img
            src={finalImageUrl}
            alt={title}
            className="max-w-[200px] max-h-[200px] object-contain"
            data-image-key={getImageCacheKey(type, id)}
          />
        </div>
      )}
    </>
  );
}; 
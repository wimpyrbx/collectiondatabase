import React, { useState, useEffect, useMemo } from 'react';
import { FaImage } from 'react-icons/fa';
import { getProductImageUrl, getInventoryImageUrl, getInventoryWithFallbackUrl, getImageCacheKey, type ImageInvalidationDetail } from '@/utils/imageUtils';
import clsx from 'clsx';

// Base props shared between both types
interface BaseImageProps {
  title: string;
  className?: string;
  placeholderClassName?: string;
  containerClassName?: string;
}

// Product-specific props
interface ProductImageProps extends BaseImageProps {
  type: 'product';
  id: number;
  productId?: never; // Ensure productId is not used with product type
}

// Inventory-specific props
interface InventoryImageProps extends BaseImageProps {
  type: 'inventory';
  id: number;
  productId?: number; // Optional for inventory, but recommended for fallback
}

// Union type of all possible props
type ImageDisplayProps = ProductImageProps | InventoryImageProps;

// Type guard to check if props are for inventory
function isInventoryProps(props: ImageDisplayProps): props is InventoryImageProps {
  return props.type === 'inventory';
}

export const ImageDisplay: React.FC<ImageDisplayProps> = (props) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageKey, setImageKey] = useState(Date.now());
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidated = (event: CustomEvent<ImageInvalidationDetail>) => {
      const { type: invalidatedType, id: invalidatedId, relatedIds } = event.detail;
      
      // Check if this event is relevant to our component
      const isRelevant = 
        // Direct match
        (invalidatedType === props.type && invalidatedId === props.id) ||
        // Related ID match (for inventory fallback)
        (isInventoryProps(props) && invalidatedType === 'product' && props.productId === invalidatedId) ||
        // Check in related IDs
        (relatedIds?.includes(props.id));
      
      if (isRelevant) {
        // Force a re-render of the image by updating the key
        setImageKey(Date.now());
        setIsLoading(true);
        setHasError(false);
        setErrorDetails('');
      }
    };

    window.addEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    return () => {
      window.removeEventListener('image-cache-invalidated', handleCacheInvalidated as EventListener);
    };
  }, [props.type, props.id, isInventoryProps(props) ? props.productId : undefined]);

  const imageUrl = useMemo(() => {
    if (props.type === 'product') {
      return getProductImageUrl(props.id);
    }
    return props.productId 
      ? getInventoryWithFallbackUrl(props.id, props.productId)
      : getInventoryImageUrl(props.id);
  }, [props.type, props.id, isInventoryProps(props) ? props.productId : undefined, imageKey]);

  // Reset states when id, type, or imageKey changes
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorDetails('');
  }, [props.id, props.type, imageKey]);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    setErrorDetails('');
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    const error = `Failed to load image: ${target.src}`;
    //console.error('[ImageDisplay] Image load error:', {
    //  type: props.type,
    //  id: props.id,
    //  url: imageUrl,
    //  error
    //});
    setIsLoading(false);
    setHasError(true);
    setErrorDetails(error);
  };

  // Show placeholder if there's an error
  if (hasError) {
    return (
      <div 
        className={clsx(props.containerClassName, "h-full flex items-center justify-center")}
        title={errorDetails}
      >
        <FaImage className={clsx("text-gray-500", props.placeholderClassName)} />
      </div>
    );
  }

  return (
    <div className={clsx(props.containerClassName, "h-full relative")}>
      <img
        key={imageUrl}
        src={imageUrl}
        alt={props.title}
        className={clsx(
          props.className,
          isLoading && 'opacity-0'
        )}
        onLoad={handleLoad}
        onError={handleError}
        data-image-key={getImageCacheKey(props.type, props.id)}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700/50">
          <FaImage className={clsx("text-gray-500", props.placeholderClassName)} />
        </div>
      )}
    </div>
  );
}; 
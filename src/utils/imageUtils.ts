/**
 * Gets the image paths for both inventory and product images
 * @param id - The ID of the inventory or product
 * @param type - The type of the inventory or product
 * @returns a string of the image path based on the rule of 3 digits for the folder and the id for the file
 * example: id=123456789, type=inventory -> images/inventory/123/123456789.webp
 * example: id=123456789, type=product -> images/product/123/123456789.webp
 */
export const getImagePath = (id: number, type: 'inventory' | 'product'): string => {
  const folder = String(id).slice(0, 3);
  const pluralType = type === 'product' ? 'product' : 'inventory';
  const path = `images/${pluralType}/${folder}/${id}.webp`;
  return path;
}; 

// Configuration
const DEV_MODE = true; // Toggle this for development/production
const BASE_URL = DEV_MODE ? 'http://localhost:80' : ''; // Explicitly use port 80 for PHP backend

// Debug mode for logging
const DEBUG = false;

type ImageType = 'inventory' | 'product';

// Centralized image version cache
const imageVersions = new Map<string, number>();

// Helper function for logging
const logDebug = (...args: any[]) => {
  if (DEBUG) {
    //console.log('[ImageUtils]', ...args);
  }
};

// Enhanced debug logging for image operations
const logImageOperation = (operation: string, data: any) => {
  if (DEBUG) {
    //console.group(`[ImageUtils] ${operation}`);
    //console.log('Time:', new Date().toISOString());
    Object.entries(data).forEach(([key, value]) => {
      //console.log(`${key}:`, value);
    });
    console.groupEnd();
  }
};

export interface ImageInvalidationDetail {
  type: 'product' | 'inventory';
  id: number;
  relatedIds?: number[]; // For cases like inventory fallback to product
}

export const getImageCacheKey = (type: 'product' | 'inventory', id: number) => `${type}-${id}`;

export const invalidateImage = (type: 'product' | 'inventory', id: number, relatedIds?: number[]) => {
  // Update version for the main image
  const key = getImageCacheKey(type, id);
  imageVersions.set(key, Date.now());

  // Update versions for any related images
  if (relatedIds) {
    relatedIds.forEach(relatedId => {
      const relatedKey = getImageCacheKey(type, relatedId);
      imageVersions.set(relatedKey, Date.now());
    });
  }

  // Dispatch event with all affected IDs
  window.dispatchEvent(new CustomEvent('image-cache-invalidated', { 
    detail: {
      type,
      id,
      relatedIds
    } as ImageInvalidationDetail
  }));
};

export const getImageVersion = (type: 'product' | 'inventory', id: number) => {
  const key = getImageCacheKey(type, id);
  if (!imageVersions.has(key)) {
    imageVersions.set(key, Date.now());
  }
  return imageVersions.get(key);
};

/**
 * Gets the URL for a product image only
 * Will return 404 if the product image doesn't exist
 * @param productId - The ID of the product
 */
export const getProductImageUrl = (productId: number): string => {
  const version = getImageVersion('product', productId);
  const url = `${BASE_URL}/api/image.php?mode=product&id=${productId}&v=${version}${DEV_MODE ? '&devmode=true' : ''}&fresh=true`;
  logImageOperation('getProductImageUrl', {
    productId,
    version,
    url,
    type: 'product'
  });
  return url;
};

/**
 * Gets the URL for an inventory image only
 * Will return 404 if the inventory image doesn't exist
 * @param inventoryId - The ID of the inventory item
 */
export const getInventoryImageUrl = (inventoryId: number): string => {
  const version = getImageVersion('inventory', inventoryId);
  const url = `${BASE_URL}/api/image.php?mode=inventory&id=${inventoryId}&v=${version}${DEV_MODE ? '&devmode=true' : ''}&fresh=true`;
  logImageOperation('getInventoryImageUrl', {
    inventoryId,
    version,
    url,
    type: 'inventory'
  });
  return url;
};

/**
 * Gets the URL for an inventory image with product fallback
 * Will try inventory image first, then product image if inventory doesn't exist
 * @param inventoryId - The ID of the inventory item
 * @param productId - The ID of the product (for fallback)
 */
export const getInventoryWithFallbackUrl = (inventoryId: number, productId: number): string => {
  const inventoryVersion = getImageVersion('inventory', inventoryId);
  const productVersion = getImageVersion('product', productId);
  const url = `${BASE_URL}/api/image.php?mode=inventory-with-fallback&id=${inventoryId}&product_id=${productId}&v=${inventoryVersion}_${productVersion}${DEV_MODE ? '&devmode=true' : ''}&fresh=true`;
  logImageOperation('getInventoryWithFallbackUrl', {
    inventoryId,
    productId,
    inventoryVersion,
    productVersion,
    url,
    type: 'inventory-with-fallback'
  });
  return url;
}; 

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    path?: string;
  };
}

export interface UploadResult {
  success: boolean;
  message: string;
  imagePath?: string;
}

export const uploadImage = async (type: 'product' | 'inventory', id: number, file: File): Promise<UploadResult> => {
  const formData = new FormData();
  
  formData.append('type', String(type));
  formData.append('id', String(id));
  formData.append('image', file);

  try {
    const response = await fetch(`${BASE_URL}/api/upload.php`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    let responseText: string;
    try {
      responseText = await response.text();
      
      try {
        const result = JSON.parse(responseText);
        if (result.success) {
          // Invalidate the cache for this image
          invalidateImage(type, id);
        } else {
          console.error('Upload failed:', {
            result,
            debug: result.debug
          });
        }
        return {
          success: result.success,
          message: result.message,
          imagePath: result.data?.path
        };
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', {
          responseText,
          error: parseError
        });
        return {
          success: false,
          message: `Server returned invalid response: ${responseText.substring(0, 100)}...`
        };
      }
    } catch (error) {
      console.error('Failed to read response:', error);
      return {
        success: false,
        message: 'Failed to read server response'
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload image'
    };
  }
};

export interface ImageUploadHandlers {
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useImageUpload(
  type: 'product' | 'inventory',
  id: number,
  {
    onUploadStart,
    onUploadSuccess,
    onUploadError,
    onUploadComplete
  }: {
    onUploadStart?: () => void;
    onUploadSuccess?: (result: UploadResult) => void;
    onUploadError?: (message: string) => void;
    onUploadComplete?: () => void;
  } = {}
): ImageUploadHandlers {
  const handleUpload = async (file: File) => {
    onUploadStart?.();
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        onUploadError?.('Please upload an image file');
        return;
      }

      const result = await uploadImage(type, id, file);
      
      if (!result.success) {
        onUploadError?.(result.message);
        return;
      }

      onUploadSuccess?.(result);
    } catch (error) {
      console.error('Failed to upload image:', error);
      onUploadError?.('An unexpected error occurred while uploading the image');
    } finally {
      onUploadComplete?.();
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files[0];
    if (!file) return;

    await handleUpload(file);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await handleUpload(file);
  };

  return {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileInputChange
  };
} 

export interface DeleteImageResult {
  success: boolean;
  message: string;
}

export async function deleteImage(type: 'product' | 'inventory', id: number): Promise<DeleteImageResult> {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('id', id.toString());

  try {
    
    const response = await fetch(`${BASE_URL}/api/delete.php${DEV_MODE ? '?devmode=true' : ''}`, {
      method: 'POST',
      body: formData
    });

    let result;
    try {
      const responseText = await response.text();
      
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse response:', responseText);
        return {
          success: false,
          message: `Server returned invalid JSON response: ${responseText.substring(0, 100)}...`
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to read response:', error);
      return {
        success: false,
        message: `Failed to read server response: ${message}`
      };
    }

    if (!response.ok || !result.success) {
      return {
        success: false,
        message: result.message || `Delete failed with status ${response.status}`
      };
    }

    invalidateImage(type, id);
    return {
      success: true,
      message: result.message
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Delete error:', error);
    return {
      success: false,
      message: `Network or system error: ${message}`
    };
  }
} 

/**
 * Checks if a real image exists (not a placeholder) for the given product or inventory
 * @param id - The ID of the product or inventory
 * @param type - The type of image to check
 * @param productId - Optional product ID for inventory fallback
 * @returns Promise<boolean> - true if a real image exists, false if it's a placeholder
 */
export async function checkImageExists(
  id: number, 
  type: 'product' | 'inventory',
  productId?: number
): Promise<boolean> {
  const mode = type === 'inventory' && productId 
    ? 'inventory-with-fallback'
    : type === 'product' ? 'product' : type;

  const url = `${BASE_URL}/api/image.php?mode=${mode}&id=${id}${productId ? `&product_id=${productId}` : ''}&check=true&fresh=true${DEV_MODE ? '&devmode=true' : ''}`;

  try {
    const startTime = performance.now();
    const response = await fetch(url);
    const endTime = performance.now();
    const responseText = await response.text();
    
    logImageOperation('checkImageExists Response', {
      url,
      requestDuration: `${(endTime - startTime).toFixed(2)}ms`,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseText,
      mode,
      type,
      id,
      success: response.ok && response.status === 200
    });

    if (!response.ok) {
      console.error('[ImageUtils] Image check failed:', {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        url
      });
      return false;
    }

    return response.status === 200;
  } catch (error) {
    console.error('[ImageUtils] Error checking image:', {
      type,
      id,
      productId,
      error,
      url,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

// Keep for backward compatibility
export async function checkProductImageExists(productId: number): Promise<boolean> {
  return checkImageExists(productId, 'product');
} 

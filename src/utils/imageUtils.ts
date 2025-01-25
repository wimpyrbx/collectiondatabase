/**
 * Gets the image paths for both inventory and product images
 * @param id - The ID of the inventory or product
 * @param type - The type of the inventory or product
 * @returns a string of the image path based on the rule of 3 digits for the folder and the id for the file
 * example: id=123456789, type=inventory -> images/inventory/123/123456789.webp
 * example: id=123456789, type=product -> images/products/123/123456789.webp
 */
export const getImagePath = (id: number, type: 'inventory' | 'product'): string => {
  return `images/${type}/${String(id).slice(0, 3)}/${id}.webp`;
}; 

// Configuration
const DEV_MODE = true; // Toggle this for development/production
const BASE_URL = DEV_MODE ? 'http://localhost' : '';

type ImageType = 'inventory' | 'products';

/**
 * Gets the URL for a product image only
 * Will return 404 if the product image doesn't exist
 * @param productId - The ID of the product
 */
export const getProductImageUrl = (productId: number): string => {
  return `${BASE_URL}/api/image.php?mode=products&id=${productId}${DEV_MODE ? '&devmode=true' : ''}`;
};

/**
 * Gets the URL for an inventory image only
 * Will return 404 if the inventory image doesn't exist
 * @param inventoryId - The ID of the inventory item
 */
export const getInventoryImageUrl = (inventoryId: number): string => {
  return `${BASE_URL}/api/image.php?mode=inventory&id=${inventoryId}${DEV_MODE ? '&devmode=true' : ''}`;
};

/**
 * Gets the URL for an inventory image with product fallback
 * Will try inventory image first, then product image if inventory doesn't exist
 * @param inventoryId - The ID of the inventory item
 * @param productId - The ID of the product (for fallback)
 */
export const getInventoryWithFallbackUrl = (inventoryId: number, productId: number): string => {
  return `${BASE_URL}/api/image.php?mode=inventory-with-fallback&id=${inventoryId}&product_id=${productId}${DEV_MODE ? '&devmode=true' : ''}`;
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

export async function uploadImage(file: File, type: 'product' | 'inventory', id: number): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('type', type);
  formData.append('id', id.toString());

  try {
    console.log('Starting upload:', { type, id, fileName: file.name });
    
    const response = await fetch(`${BASE_URL}/api/upload.php${DEV_MODE ? '?devmode=true' : ''}`, {
      method: 'POST',
      body: formData
    });

    let result: UploadResponse;
    let responseText: string;
    
    try {
      responseText = await response.text();
      console.log('Raw response:', responseText);
      
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
      console.error('Upload failed:', { result, status: response.status });
      return {
        success: false,
        message: result.message || `Upload failed with status ${response.status}. ${result.data ? JSON.stringify(result.data) : ''}`
      };
    }

    if (!result.data?.path) {
      console.error('Upload succeeded but no path returned:', result);
      return {
        success: false,
        message: 'Server did not return image path'
      };
    }

    console.log('Upload successful:', result);
    return {
      success: true,
      message: result.message,
      imagePath: result.data.path
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Upload error:', error);
    return {
      success: false,
      message: `Network or system error: ${message}`
    };
  }
} 

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

      const result = await uploadImage(file, type, id);
      
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
    console.log('Deleting image:', { type, id });
    
    const response = await fetch(`${BASE_URL}/api/delete.php${DEV_MODE ? '?devmode=true' : ''}`, {
      method: 'POST',
      body: formData
    });

    let result;
    try {
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
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
      console.error('Delete failed:', { result, status: response.status });
      return {
        success: false,
        message: result.message || `Delete failed with status ${response.status}`
      };
    }

    console.log('Delete successful:', result);
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
 * Checks if a real image exists (not a placeholder) for the given product
 * @param productId - The ID of the product
 * @returns Promise<boolean> - true if a real image exists, false if it's a placeholder
 */
export async function checkProductImageExists(productId: number): Promise<boolean> {
  try {
    const response = await fetch(
      `${BASE_URL}/api/image.php?mode=products&id=${productId}&check=true${DEV_MODE ? '&devmode=true' : ''}`,
      { method: 'HEAD' }
    );
    
    // 200 means real image exists, 204 means placeholder
    return response.status === 200;
  } catch (error) {
    console.error('Failed to check image existence:', error);
    return false;
  }
} 

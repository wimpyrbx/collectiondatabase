import { uploadImage } from '@/utils/imageUtils';

export interface ImageUploadHandlers {
  onUploadStart?: () => void;
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (message: string) => void;
  onUploadComplete?: () => void;
}

export const useImageUpload = (
  type: 'product' | 'inventory',
  id: number,
  handlers: ImageUploadHandlers = {}
) => {
  const handleUpload = async (file: File) => {
    try {
      handlers.onUploadStart?.();
      
      const result = await uploadImage(type, id, file);
      
      if (!result.success) {
        handlers.onUploadError?.(result.message);
        return;
      }

      handlers.onUploadSuccess?.(result);
    } catch (error) {
      handlers.onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      handlers.onUploadComplete?.();
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  return {
    handleFileInputChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
}; 
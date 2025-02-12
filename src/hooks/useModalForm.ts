import { useState, useCallback, useEffect } from 'react';

interface UseModalFormOptions<T> {
  initialData: T | null | undefined;
  isOpen: boolean;
  onClose: () => void;
  transform?: (data: T | null) => any;
  onReset?: () => void;
}

export function useModalForm<T>({
  initialData,
  isOpen,
  onClose,
  transform = (data: T | null) => data,
  onReset
}: UseModalFormOptions<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when modal opens/closes or initial data changes
  useEffect(() => {
    if (isOpen) {
      setFormData(transform(initialData || null));
      setErrors([]);
    } else {
      setFormData({});
      setErrors([]);
      onReset?.();
    }
  }, [isOpen, initialData, transform, onReset]);

  const handleInputChange = useCallback(<K extends keyof any>(field: K, value: any) => {
    setErrors([]); // Clear errors when user makes changes
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleClose = useCallback(() => {
    setFormData({});
    setErrors([]);
    onClose();
  }, [onClose]);

  return {
    formData,
    errors,
    setErrors,
    handleInputChange,
    handleClose
  };
} 
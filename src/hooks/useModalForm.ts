import { useState, useCallback, useEffect } from 'react';

interface UseModalFormOptions<T> {
  initialData: T | null;
  isOpen: boolean;
  onClose: () => void;
  transform?: (data: T) => any;
  onReset?: () => void;
}

export function useModalForm<T extends object>({
  initialData,
  isOpen,
  onClose,
  transform = (data: T) => data,
  onReset
}: UseModalFormOptions<T>) {
  const [formData, setFormData] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when modal opens/closes or initial data changes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(transform(initialData));
      setErrors([]);
    } else if (!isOpen) {
      setFormData({});
      setErrors([]);
      onReset?.();
    }
  }, [isOpen, initialData, transform, onReset]);

  const handleInputChange = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setErrors([]); // Clear errors when user makes changes
    setFormData(prev => ({
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
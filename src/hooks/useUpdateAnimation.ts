import { useState, useEffect } from 'react';

export const useUpdateAnimation = (id: number | string) => {
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    // If there's an ID, trigger the animation
    if (id) {
      setIsUpdated(true);
      const timer = setTimeout(() => setIsUpdated(false), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsUpdated(false);
    }
  }, [id]); // Depend on id changes

  return {
    isUpdated,
    triggerUpdate: () => setIsUpdated(true),
    className: isUpdated ? 'animate-flash-green' : ''
  };
}; 
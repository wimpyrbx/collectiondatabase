import React from 'react';
import { FaBox, FaCheck } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { StatusButtons } from './StatusButtons';
import { Card } from '@/components/card';
import { SupabaseClient } from '@supabase/supabase-js';
import type { SaleViewItem } from '@/types/sale';

interface StatusSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isTransitionAllowed: (from: string, to: string) => boolean;
  isConnectedToSale: boolean;
  setIsConnectedToSale: (value: boolean) => void;
  handleInputChange: (field: string, value: any) => void;
  handleRemoveFromSale: () => Promise<void>;
  updateInventory: SupabaseClient;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  availableSales: SaleViewItem[];
}

const StatusSection: React.FC<StatusSectionProps> = ({
  inventory,
  formData,
  isTransitionAllowed,
  isConnectedToSale,
  setIsConnectedToSale,
  handleInputChange,
  handleRemoveFromSale,
  updateInventory,
  setErrors,
  availableSales
}) => {
  return (
      <StatusButtons
        inventory={inventory}
        formData={formData}
        isTransitionAllowed={isTransitionAllowed}
        isConnectedToSale={isConnectedToSale}
        setIsConnectedToSale={setIsConnectedToSale}
        handleInputChange={handleInputChange}
        handleRemoveFromSale={handleRemoveFromSale}
        supabase={updateInventory}
        setErrors={setErrors}
        availableSales={availableSales}
      />
  );
};

export default StatusSection; 
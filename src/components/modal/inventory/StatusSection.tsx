import React from 'react';
import { FaBox, FaCheck } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { StatusButtons } from './StatusButtons';

interface StatusSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  isTransitionAllowed: (currentStatus: string, targetStatus: string, saleStatus: string | null) => boolean;
  isConnectedToSale: boolean;
  setIsConnectedToSale: (value: boolean) => void;
  handleInputChange: (key: string, value: any) => void;
  handleRemoveFromSale: () => Promise<void>;
  updateInventory: (params: { id: number; updates: any }) => Promise<any> | void;
  setErrors: (errors: string[] | ((prev: string[]) => string[])) => void;
  availableSales: any[];
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
    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaBox className="text-blue-400" />
          Inventory Status
        </h3>
      </div>
      <div className="p-4 relative">
        {formData.inventory_status === 'Sold' && formData.sale_status === 'Finished' && (
          <div className="absolute inset-0 z-10 bg-gray-900/90 backdrop-blur-[1px] flex items-center justify-center rounded-b-lg">
            <div className="text-2xl font-bold text-gray-300 flex flex-col items-center gap-2">
              <FaCheck className="w-8 h-8 text-green-400" />
              ITEM IS SOLD
            </div>
          </div>
        )}
        <div className="space-y-3">
          <StatusButtons 
            inventory={inventory}
            formData={formData}
            isTransitionAllowed={isTransitionAllowed}
            isConnectedToSale={isConnectedToSale}
            setIsConnectedToSale={setIsConnectedToSale}
            handleInputChange={handleInputChange}
            handleRemoveFromSale={handleRemoveFromSale}
            updateInventory={updateInventory}
            setErrors={setErrors}
            availableSales={availableSales}
          />
        </div>
      </div>
    </div>
  );
};

export default StatusSection; 
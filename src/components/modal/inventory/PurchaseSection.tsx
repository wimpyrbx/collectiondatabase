import React, { useState } from 'react';
import clsx from 'clsx';
import { FaStore, FaCalendar, FaMapMarker, FaBox, FaChevronDown, FaExclamationTriangle, FaDollarSign } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { Button } from '@/components/ui';
import { FormElement } from '@/components/formelement';
import { Combobox } from '@headlessui/react';
import { PurchaseItem } from './types';

interface PurchaseSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  availablePurchases: PurchaseItem[];
  isLoadingPurchases: boolean;
  handlePurchaseSelect: (purchaseId: number) => Promise<void>;
  handleRemovePurchase: () => Promise<void>;
  handleInputChange: (key: string, value: any) => void;
}

export const PurchaseSection: React.FC<PurchaseSectionProps> = ({
  inventory,
  formData,
  availablePurchases,
  isLoadingPurchases,
  handlePurchaseSelect,
  handleRemovePurchase,
  handleInputChange
}) => {
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [isSearchingPurchases, setIsSearchingPurchases] = useState(false);

  // Filter purchases based on search query
  const filteredPurchases = React.useMemo(() => {
    return purchaseSearchQuery === ''
      ? availablePurchases
      : availablePurchases.filter((purchase) => {
          const searchLower = purchaseSearchQuery.toLowerCase();
          return (
            purchase.seller?.toLowerCase().includes(searchLower) ||
            purchase.origin?.toLowerCase().includes(searchLower) ||
            purchase.purchase_id.toString().includes(searchLower)
          );
      });
  }, [availablePurchases, purchaseSearchQuery]);

  return (
    <div className="bg-gray-900/50 rounded-lg overflow-hidden transition-opacity duration-200">
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaStore className="text-purple-400" />
          Purchase Information
        </h3>
      </div>
      <div className="p-4">
        {inventory?.purchase_id ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Connected Purchase Display */}
            <div className="bg-gradient-to-r from-purple-700/20 to-purple-600/10 rounded-lg p-3 border border-purple-500/20 relative mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded">
                    <FaStore className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-gray-200 font-medium flex items-center gap-2">
                      {formData.purchase_seller || inventory?.purchase_seller || 'No seller name'}
                      <span className="text-xs text-gray-500">#{formData.purchase_id || inventory?.purchase_id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <FaCalendar className="w-3 h-3" />
                        {formData.purchase_date ? new Date(formData.purchase_date).toLocaleDateString('no-NO') : inventory?.purchase_date ? new Date(inventory.purchase_date).toLocaleDateString('no-NO') : '-'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <FaMapMarker className="w-3 h-3" />
                        {formData.purchase_origin || inventory?.purchase_origin || '-'}
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleRemovePurchase}
                  bgColor="bg-red-900/50"
                  size="sm"
                  className="text-xs"
                >
                  Disconnect
                </Button>
              </div>
              <div className="absolute -top-3 right-4 bg-gray-800 px-2 py-0.5 text-xs text-purple-400 font-medium rounded">
                Connected Purchase
              </div>
            </div>
            
            <FormElement
              elementType="input"
              label="Purchase Cost (NOK)"
              labelIcon={<FaDollarSign />}
              labelIconColor="text-green-400"
              initialValue={formData.purchase_cost ? Math.round(Number(formData.purchase_cost)).toString() : ''}
              onValueChange={(value) => handleInputChange('purchase_cost', value)}
              numericOnly
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-gray-400 text-sm mb-2">
              {availablePurchases.length === 0 ? (
                <div className="flex items-center gap-2">
                  <FaExclamationTriangle className="text-yellow-500" />
                  Purchase functionality not available (view_purchases not found)
                </div>
              ) : (
                "Select a purchase to connect:"
              )}
            </div>
            
            {/* Only show the dropdown if we have purchases */}
            {availablePurchases.length > 0 && (
              <div className="relative">
                <Combobox onChange={handlePurchaseSelect}>
                  <div className="relative">
                    <div className="flex">
                      <Combobox.Input
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="Search purchases..."
                        onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchingPurchases(true)}
                        onBlur={() => setTimeout(() => setIsSearchingPurchases(false), 200)}
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <FaChevronDown className="w-3 h-3 text-gray-400" />
                      </Combobox.Button>
                    </div>
                    
                    {isSearchingPurchases && (
                      <Combobox.Options 
                        className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto py-1 text-sm"
                        static
                      >
                        {isLoadingPurchases ? (
                          <div className="px-4 py-2 text-gray-400">Loading purchases...</div>
                        ) : filteredPurchases.length === 0 ? (
                          <div className="px-4 py-2 text-gray-400">No purchases found</div>
                        ) : (
                          filteredPurchases.map((purchase) => (
                            <Combobox.Option
                              key={purchase.purchase_id}
                              value={purchase.purchase_id}
                              className={({ active }) =>
                                `cursor-pointer select-none relative py-2 px-4 ${
                                  active ? 'bg-purple-500/20 text-gray-200' : 'text-gray-300'
                                }`
                              }
                            >
                              {({ selected, active }) => (
                                <div className="flex flex-col">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{purchase.seller || 'No seller'}</span>
                                    <span className="text-xs text-gray-400">#{purchase.purchase_id}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1">
                                      <FaCalendar className="w-2 h-2" />
                                      {purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString('no-NO') : '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FaMapMarker className="w-2 h-2" />
                                      {purchase.origin || '-'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <FaBox className="w-2 h-2" />
                                      {purchase.item_count || 0} items
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    )}
                  </div>
                </Combobox>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseSection; 
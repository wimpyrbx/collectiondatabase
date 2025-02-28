import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { FaStore, FaCalendar, FaMapMarker, FaBox, FaChevronDown, FaExclamationTriangle, FaDollarSign } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { Button } from '@/components/ui';
import { FormElement } from '@/components/formelement';
import { Combobox } from '@headlessui/react';
import { PurchaseItem } from './types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';

interface PurchaseSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  availablePurchases: PurchaseItem[];
  isLoadingPurchases: boolean;
  handlePurchaseSelect: (purchaseId: number) => Promise<void>;
  handleRemovePurchase: () => Promise<void>;
  handleInputChange: (key: string, value: any) => void;
  setCanDelete: (canDelete: boolean) => void;
}

export const PurchaseSection: React.FC<PurchaseSectionProps> = ({
  inventory,
  formData,
  availablePurchases,
  isLoadingPurchases,
  handlePurchaseSelect,
  handleRemovePurchase,
  handleInputChange,
  setCanDelete
}) => {
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
  const [isSearchingPurchases, setIsSearchingPurchases] = useState(false);
  const [localPurchaseId, setLocalPurchaseId] = useState<number | null>(formData.purchase_id || inventory?.purchase_id || null);

  // Update useEffect to sync the localPurchaseId with props
  useEffect(() => {
    setLocalPurchaseId(formData.purchase_id || inventory?.purchase_id || null);
  }, [formData.purchase_id, inventory?.purchase_id]);

  // Query to get all items connected to the current purchase
  const { data: connectedItems = [], isLoading: isLoadingConnectedItems, error: connectedItemsError } = useQuery({
    queryKey: ['purchase_items', localPurchaseId],
    queryFn: async () => {
      if (!localPurchaseId) return [];

      console.log('Fetching connected items for purchase:', localPurchaseId);

      const { data, error } = await supabase
        .from('view_inventory')
        .select(`
          inventory_id,
          product_id,
          product_title,
          product_variant,
          inventory_status,
          override_price,
          final_price,
          prices
        `)
        .eq('purchase_id', localPurchaseId);

      if (error) {
        console.error('Error fetching connected items:', error);
        throw error;
      }

      console.log('Connected items data:', data);
      return data as InventoryViewItem[];
    },
    enabled: !!localPurchaseId
  });

  // Calculate total value of connected items
  const totalValue = React.useMemo(() => {
    if (!connectedItems?.length) return 0;
    
    const total = connectedItems.reduce((sum, item) => {
      const itemPrice = item.final_price || 
                       item.override_price || 
                       (item.prices?.complete?.nok_fixed) || 0;
      console.log(`Item ${item.product_title} price:`, itemPrice);
      return sum + itemPrice;
    }, 0);

    console.log('Total value calculated:', total);
    return total;
  }, [connectedItems]);

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

  // Add this sorted items calculation before the render
  const sortedConnectedItems = React.useMemo(() => {
    if (!connectedItems?.length) return [];
    
    return [...connectedItems].sort((a, b) => {
      // First sort by title
      const titleCompare = (a.product_title || '').localeCompare(b.product_title || '');
      if (titleCompare !== 0) return titleCompare;
      
      // If titles are same, sort by variant
      return (a.product_variant || '').localeCompare(b.product_variant || '');
    });
  }, [connectedItems]);

  // Handle disconnect with local state update
  const handleDisconnect = async () => {
    try {
      // Call API first
      await handleRemovePurchase();
      
      // Only if API call succeeds, update local state
      setLocalPurchaseId(null);
      handleInputChange('purchase_id', null);
      handleInputChange('purchase_seller', null);
      handleInputChange('purchase_origin', null);
      handleInputChange('purchase_date', null);
      handleInputChange('purchase_cost', null);

      // Update delete button state based on sale connection
      setCanDelete(!formData.sale_id);

      // Clear search states
      setPurchaseSearchQuery('');
      setIsSearchingPurchases(false);
    } catch (error) {
      // Don't update delete button state on error
      console.error('Error disconnecting purchase:', error);
    }
  };

  return (
    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaStore className="text-purple-400" />
          Purchase Information
        </h3>
      </div>
      <div className="p-4">
        {localPurchaseId ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Connected Purchase Display */}
            <div className="bg-gradient-to-r from-purple-700/20 to-purple-600/10 rounded-lg p-3 border border-purple-500/20 relative">
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
                  onClick={handleDisconnect}
                  bgColor="bg-red-900/50"
                  size="sm"
                  className="text-xs"
                >
                  Disconnect
                </Button>
              </div>

              {/* Connected Items List */}
              <div className="mt-4 border-t border-purple-500/20 pt-0">
                <div className="text-sm text-gray-400 mb-2">
                  {isLoadingConnectedItems && (
                    <span className="ml-2 text-gray-500">(Loading...)</span>
                  )}
                </div>
                {connectedItemsError ? (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <FaExclamationTriangle />
                    Error loading connected items
                  </div>
                ) : (
                  <>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 h-[100px] overflow-y-auto pt-1 cursor-default">
                      {connectedItems.length === 0 ? (
                        <div className="text-gray-500 text-sm italic">
                          No items connected to this purchase
                        </div>
                      ) : (
                        sortedConnectedItems.map((item) => (
                          <div 
                            key={item.inventory_id} 
                            className={clsx(
                              "flex items-center justify-between",
                              "text-xs",
                              item.inventory_id === inventory?.inventory_id && "ring-1 ring-cyan-500 bg-cyan-500/10"
                            )}
                          >
                            <div className="flex flex-col">
                              <span className="text-gray-200">
                                {item.product_title}
                                {item.product_variant && (
                                  <span className="text-xs text-gray-400 ml-1">({item.product_variant})</span>
                                )}
                              </span>
                            </div>
                            <div className="text-sm text-green-400">
                              NOK {Math.round(item.final_price || item.override_price || (item.prices?.complete?.nok_fixed) || 0)},-
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 flex justify-between items-center border-t border-purple-500/20 pt-4">
                      <span className="text-sm text-gray-400">Total Value:</span>
                      <span className="text-lg font-medium text-green-400">
                        NOK {Math.round(totalValue)},-
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="absolute -top-3 right-4 bg-gray-800 px-2 py-0.5 text-xs text-purple-400 font-medium rounded">
                Connected Purchase
              </div>
            </div>
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
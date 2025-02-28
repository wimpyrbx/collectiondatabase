import React from 'react';
import clsx from 'clsx';
import { FaShoppingCart, FaUser, FaCalendar, FaBox, FaDollarSign, FaChevronRight, FaExclamationTriangle } from 'react-icons/fa';
import { SaleViewItem } from '@/types/sale';
import { InventoryViewItem } from '@/types/inventory';
import { Button } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';

interface SaleSectionProps {
  inventory: InventoryViewItem | null;
  formData: any;
  availableSales: SaleViewItem[];
  isConnectedToSale: boolean;
  localSalesTotals: Record<number, { items: number, total: number }>;
  handleSaleSelect: (saleId: number) => Promise<void>;
  handleInputChange: (key: string, value: any) => void;
}

export const SaleSection: React.FC<SaleSectionProps> = ({
  inventory,
  formData,
  availableSales,
  isConnectedToSale,
  localSalesTotals,
  handleSaleSelect,
  handleInputChange
}) => {
  return (
    <div className={clsx(
      "bg-gray-900/50 rounded-lg overflow-hidden transition-all duration-200",
      formData.inventory_status !== 'For Sale' && !(formData.inventory_status === 'Sold' && formData.sale_status === 'Reserved') && [
        "opacity-30",
        "bg-gray-900/40",
        "grayscale",
        "pointer-events-none"
      ]
    )}>
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaShoppingCart className="text-orange-400" />
          Sale Information
          {formData.inventory_status !== 'For Sale' && !(formData.inventory_status === 'Sold' && formData.sale_status === 'Reserved') && (
            <span className="text-xs text-gray-500 ml-2">
              {formData.inventory_status === 'Sold' 
                ? '(Sale is finalized)' 
                : '(Set status to For Sale to enable)'}
            </span>
          )}
        </h3>
      </div>
      <div className="p-4">
        {(formData.sale_id || (inventory?.sale_id && formData.inventory_status === 'Sold')) ? (
          <div className="space-y-4">
            {/* Connected Sale Details */}
            <div className="bg-gradient-to-r from-green-700/20 to-green-600/10 rounded-lg p-3 border border-green-500/20 relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-500/20 p-2 rounded">
                    <FaUser className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-gray-200 font-medium flex items-center gap-2">
                      {formData.sale_buyer || inventory?.sale_buyer || 'No buyer name'}
                      <span className="text-xs text-gray-500">#{formData.sale_id || inventory?.sale_id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <FaCalendar className="w-3 h-3" />
                        {formData.sale_date ? new Date(formData.sale_date).toLocaleDateString('no-NO') : inventory?.sale_date ? new Date(inventory.sale_date).toLocaleDateString('no-NO') : 'No date set yet'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={clsx(
                  "px-2 py-1 rounded text-xs font-medium",
                  (formData.sale_status || inventory?.sale_status) === 'Reserved' ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"
                )}>
                  {formData.sale_status || inventory?.sale_status}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-green-500/20">
                <div className="flex items-center">
                  <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded">
                    <FaBox className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-300">
                      {(() => {
                        const saleId = formData.sale_id || inventory?.sale_id;
                        const currentSale = availableSales.find(s => s.sale_id === saleId);
                        const localTotal = saleId && localSalesTotals[saleId];
                        
                        // Show item count, not the total price
                        return localTotal?.items || currentSale?.number_of_items || 0;
                      })()} items
                    </span>
                  </div>
                  <div className="flex-1 flex justify-end">
                    <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                      <span className="text-sm text-green-400 font-medium">
                        Total: NOK {(() => {
                          const saleId = formData.sale_id || inventory?.sale_id;
                          const currentSale = availableSales.find(s => s.sale_id === saleId);
                          const localTotal = saleId && localSalesTotals[saleId];
                          
                          // Show the total price
                          return Math.round(localTotal?.total || currentSale?.total_sold_price || 0);
                        })()},-
                      </span>
                    </div>
                  </div>
                </div>
                {(formData.sale_notes || inventory?.sale_notes) && (
                  <div className="mt-2 pt-2 border-t border-green-500/20">
                    <div className="text-xs text-gray-300 whitespace-pre-wrap break-words mt-1">
                      {formData.sale_notes || inventory?.sale_notes}
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute -top-3 right-4 bg-gray-800 px-2 py-0.5 text-xs text-green-400 font-medium rounded">
                Connected Sale
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {availableSales.length === 0 ? (
              <div className="text-gray-400 text-sm flex items-center gap-2">
                <FaExclamationTriangle className="text-yellow-500" />
                No active sales available
              </div>
            ) : (
              <>
                <div className={clsx(
                  "grid grid-cols-1 gap-2",
                  formData.inventory_status !== 'For Sale' && "opacity-40 pointer-events-none"
                )}>
                  {availableSales.map(sale => (
                    <button
                      key={sale.sale_id}
                      onClick={() => handleSaleSelect(sale.sale_id)}
                      className={clsx(
                        "w-full text-left",
                        "bg-gray-800/50 hover:bg-gray-800 rounded-lg p-3",
                        "border border-gray-700/50",
                        "transition-all duration-200",
                        "relative",
                        "cursor-pointer",
                        "hover:border-green-500/50",
                        "hover:shadow-lg hover:shadow-black/30",
                        "hover:bg-green-800/20",
                        "active:scale-[0.98]"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-cyan-500/20 p-2 rounded">
                            <FaUser className="w-4 h-4 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-gray-200 font-medium">
                              {sale.buyer_name || 'No buyer name'}
                            </div>
                            <div className="text-xs text-gray-400">
                              Created {new Date(sale.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-medium">
                            Reserved
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-gray-900/50 px-2 py-1 rounded">
                            <FaBox className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-300">
                              {(() => {
                                const localTotal = localSalesTotals[sale.sale_id];
                                // Show item count, not total price
                                return localTotal?.items || sale.number_of_items || 0;
                              })()} items
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-cyan-400">
                          <div className="flex items-center gap-2 bg-green-500/10 px-2 py-1 rounded">
                            <span className="text-sm text-green-400 font-medium">
                              NOK {Math.round(sale.total_sold_price || 0)},-
                            </span>
                          </div>
                          <span className="text-sm ml-2">Click to select</span>
                          <FaChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleSection; 
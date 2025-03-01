import React, { useState, useEffect } from 'react';
import { FaBarcode, FaPlus, FaTrash, FaPen, FaSave, FaTimes, FaBox, FaInfoCircle } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import { supabase } from '@/supabaseClient';
import { Button } from '@/components/ui';
import { notify } from '@/utils/notifications';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { TooltipWrapper } from '@/components/tooltip/TooltipWrapper';
import { BarcodeDisplay } from '@/components/barcode/BarcodeDisplay';

interface Barcode {
  id: number;
  inventory_id: number;
  barcode: string;
}

interface RelatedInventoryItem {
  inventory_id: number;
  inventory_status: string;
  product_title: string;
  product_variant?: string;
}

interface BarcodeSectionProps {
  inventory: InventoryViewItem | null;
  isConnectedToSale?: boolean;
}

export const BarcodeSection: React.FC<BarcodeSectionProps> = ({
  inventory,
  isConnectedToSale = false
}) => {
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newBarcode, setNewBarcode] = useState('');
  const [editingBarcode, setEditingBarcode] = useState<{id: number, value: string} | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [relatedItems, setRelatedItems] = useState<Record<string, RelatedInventoryItem[]>>({});
  const queryClient = useQueryClient();

  // Fetch barcodes when inventory changes
  useEffect(() => {
    const fetchBarcodes = async () => {
      if (!inventory) {
        setBarcodes([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('inventory_barcodes')
          .select('*')
          .eq('inventory_id', inventory.inventory_id);

        if (error) throw error;
        setBarcodes(data || []);
      } catch (error) {
        console.error('Error fetching barcodes:', error);
        notify('error', 'Failed to load barcodes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBarcodes();
  }, [inventory]);

  // Fetch related inventory items for each barcode
  useEffect(() => {
    const fetchRelatedItems = async () => {
      if (!inventory || barcodes.length === 0) return;

      try {
        // Get all inventory items with the same product_id that aren't sold
        const { data, error } = await supabase
          .from('view_inventory')
          .select('inventory_id, inventory_status, product_title, product_variant')
          .eq('product_id', inventory.product_id)
          .neq('inventory_id', inventory.inventory_id)
          .not('inventory_status', 'eq', 'Sold');

        if (error) throw error;

        // Group by barcode
        const itemsByBarcode: Record<string, RelatedInventoryItem[]> = {};
        
        // Initialize with empty arrays for each barcode
        barcodes.forEach(barcode => {
          itemsByBarcode[barcode.barcode] = [];
        });

        // For each barcode, find matching items
        if (data && data.length > 0) {
          // Get all barcodes for the related inventory items
          const inventoryIds = data.map(item => item.inventory_id);
          
          if (inventoryIds.length > 0) {
            const { data: barcodesData, error: barcodesError } = await supabase
              .from('inventory_barcodes')
              .select('*')
              .in('inventory_id', inventoryIds);
              
            if (barcodesError) throw barcodesError;
            
            // Map inventory items to their barcodes
            if (barcodesData) {
              barcodesData.forEach(barcodeItem => {
                const matchingItem = data.find(item => item.inventory_id === barcodeItem.inventory_id);
                if (matchingItem) {
                  // Add to the array for this barcode
                  if (itemsByBarcode[barcodeItem.barcode]) {
                    itemsByBarcode[barcodeItem.barcode].push(matchingItem);
                  } else {
                    itemsByBarcode[barcodeItem.barcode] = [matchingItem];
                  }
                }
              });
            }
          }
        }
        
        setRelatedItems(itemsByBarcode);
      } catch (error) {
        console.error('Error fetching related inventory items:', error);
      }
    };

    fetchRelatedItems();
  }, [inventory, barcodes]);

  const handleAddBarcode = async () => {
    if (!inventory) return;
    
    // Trim the barcode and validate
    const trimmedBarcode = newBarcode.trim();
    
    // Validate barcode length
    if (trimmedBarcode.length < 3) {
      notify('error', 'Barcode must be at least 3 characters long');
      return;
    }
    
    setIsAdding(true);
    try {
      const { data, error } = await supabase
        .from('inventory_barcodes')
        .insert({
          inventory_id: inventory.inventory_id,
          barcode: trimmedBarcode
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          notify('error', 'This barcode already exists for this item');
        } else {
          throw error;
        }
      } else {
        setBarcodes([...barcodes, data]);
        setNewBarcode('');
        notify('success', 'Barcode added successfully');
        
        // Update inventory cache to trigger UI refresh
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
    } catch (error) {
      console.error('Error adding barcode:', error);
      notify('error', 'Failed to add barcode');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteBarcode = async (id: number) => {
    if (!inventory) return;
    
    if (!confirm('Are you sure you want to delete this barcode?')) return;
    
    try {
      const { error } = await supabase
        .from('inventory_barcodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBarcodes(barcodes.filter(barcode => barcode.id !== id));
      notify('success', 'Barcode deleted successfully');
      
      // Update inventory cache to trigger UI refresh
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (error) {
      console.error('Error deleting barcode:', error);
      notify('error', 'Failed to delete barcode');
    }
  };

  const handleEditBarcode = (id: number, currentValue: string) => {
    setEditingBarcode({ id, value: currentValue });
    
    // Focus and select the input text after the component re-renders
    setTimeout(() => {
      const inputElement = document.querySelector(`input[data-barcode-edit-id="${id}"]`);
      if (inputElement instanceof HTMLInputElement) {
        inputElement.focus();
        inputElement.select();
      }
    }, 50);
  };

  const handleSaveEdit = async () => {
    if (!inventory || !editingBarcode) return;
    
    // Trim the barcode and validate
    const trimmedBarcode = editingBarcode.value.trim();
    
    // Validate barcode length
    if (trimmedBarcode.length < 3) {
      notify('error', 'Barcode must be at least 3 characters long');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('inventory_barcodes')
        .update({ barcode: trimmedBarcode })
        .eq('id', editingBarcode.id);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          notify('error', 'This barcode already exists for this item');
          return;
        }
        throw error;
      }
      
      setBarcodes(barcodes.map(barcode => 
        barcode.id === editingBarcode.id 
          ? { ...barcode, barcode: trimmedBarcode } 
          : barcode
      ));
      
      setEditingBarcode(null);
      notify('success', 'Barcode updated successfully');
      
      // Update inventory cache to trigger UI refresh
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    } catch (error) {
      console.error('Error updating barcode:', error);
      notify('error', 'Failed to update barcode');
    }
  };

  const handleCancelEdit = () => {
    setEditingBarcode(null);
  };

  // Render barcode tooltip content
  const renderBarcodeTooltip = (barcodeValue: string) => {
    const related = relatedItems[barcodeValue] || [];
    
    return (
      <div className="p-3 flex flex-col items-center bg-gray-900 rounded-lg">
        <BarcodeDisplay 
          value={barcodeValue} 
          height={70}
          width={1.5}
          margin={5}
          background="transparent"
          lineColor="#ffffff"
          fontSize={14}
          displayValue={true}
          className="max-w-full"
        />
        
        {related.length > 0 && (
          <div className="mt-3 w-full border-t border-gray-700 pt-2">
            <div className="text-xs text-gray-300 font-semibold mb-1 flex items-center gap-1">
              <FaBox className="text-orange-400" />
              <span>Other items with this barcode:</span>
            </div>
            <div className="max-h-[150px] overflow-y-auto w-full">
              {related.map(item => (
                <div 
                  key={item.inventory_id} 
                  className="text-xs py-1 border-b border-gray-800 last:border-b-0 flex justify-between items-center"
                >
                  <div className="text-gray-300">
                    {item.product_title}
                    {item.product_variant && (
                      <span className="text-gray-400"> ({item.product_variant})</span>
                    )}
                  </div>
                  <div className={clsx(
                    "ml-2 px-1.5 py-0.5 rounded-full text-[10px]",
                    item.inventory_status === 'Normal' && "bg-blue-600/50 text-blue-200",
                    item.inventory_status === 'Collection' && "bg-orange-600/50 text-orange-200",
                    item.inventory_status === 'For Sale' && "bg-green-600/50 text-green-200"
                  )}>
                    {item.inventory_status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {related.length === 0 && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <FaInfoCircle />
            <span>No other items with this barcode</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-900/50 rounded-lg overflow-hidden mt-4 w-full shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaBarcode className="text-orange-400" />
          Barcodes
          {isConnectedToSale && (
            <span className="text-xs text-gray-400 ml-2">
              * Can't modify barcodes while connected to a sale
            </span>
          )}
        </h3>
      </div>
      
      <div className="p-4 pt-0">
          <>
            {/* Barcode List */}
            {barcodes.length === 0 ? (
              <>
              </>
            ) : (
              <div className="space-y-2 mb-4 pt-4">
                {barcodes.map(barcode => (
                  <div 
                    key={barcode.id} 
                    className={clsx(
                      "flex items-center justify-between p-2 rounded",
                      "bg-gray-800/50 border border-gray-700/50",
                      "group hover:bg-gray-700/30 transition-colors"
                    )}
                  >
                    {editingBarcode && editingBarcode.id === barcode.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingBarcode.value}
                          onChange={(e) => setEditingBarcode({ ...editingBarcode, value: e.target.value })}
                          className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 w-[50px] text-xs"
                          placeholder="Enter barcode (min 3 chars)"
                          disabled={isConnectedToSale}
                          data-barcode-edit-id={editingBarcode.id}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editingBarcode.value.trim().length >= 3 && !isConnectedToSale) {
                              e.preventDefault();
                              handleSaveEdit();
                            }
                          }}
                        />
                        <Button
                          onClick={handleSaveEdit}
                          size="xs"
                          iconLeft={<FaSave />}
                          bgColor="bg-green-600/80"
                          className="h-[16px]"
                          disabled={isConnectedToSale || editingBarcode.value.trim().length < 3}
                        >
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          size="xs"
                          iconLeft={<FaTimes />}
                          bgColor="bg-gray-600/80"
                          className="h-[16px]"
                          disabled={isConnectedToSale}
                        >
                        </Button>
                      </div>
                    ) : (
                      <>
                        <TooltipWrapper
                          content={renderBarcodeTooltip(barcode.barcode)}
                          placement="top"
                          style="minimal"
                        >
                          <div className="flex items-center gap-2 cursor-help">
                            <FaBarcode className="text-orange-400" />
                            <span className="text-gray-200 font-mono">{barcode.barcode}</span>
                            {relatedItems[barcode.barcode]?.length > 0 && (
                              <span className="bg-orange-600/40 text-orange-200 text-[10px] px-1.5 rounded-full">
                                +{relatedItems[barcode.barcode].length}
                              </span>
                            )}
                          </div>
                        </TooltipWrapper>
                        <div className={clsx(
                          "flex items-center gap-2",
                          isConnectedToSale && "opacity-50 pointer-events-none"
                        )}>
                          <Button
                            onClick={() => handleEditBarcode(barcode.id, barcode.barcode)}
                            size="xs"
                            iconLeft={<FaPen />}
                            bgColor="bg-orange-600/80"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-[16px]"
                            disabled={isConnectedToSale}
                          >
                          </Button>
                          <Button
                            onClick={() => handleDeleteBarcode(barcode.id)}
                            size="xs"
                            iconLeft={<FaTrash />}
                            bgColor="bg-red-600/80"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-[16px]"
                            disabled={isConnectedToSale}
                          >
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add New Barcode */}
            <div className={clsx(
              "flex items-center gap-2 mt-4",
              isConnectedToSale && "opacity-50 pointer-events-none"
            )}>
              <input
                type="text"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1 text-gray-200 w-[50px] text-xs"
                placeholder="Enter new barcode (min 3 chars)"
                disabled={isAdding || isConnectedToSale}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newBarcode.trim().length >= 3 && !isAdding && !isConnectedToSale) {
                    e.preventDefault();
                    handleAddBarcode();
                  }
                }}
              />
              <Button
                onClick={handleAddBarcode}
                iconLeft={isAdding ? undefined : <FaPlus />}
                bgColor="bg-orange-600/80"
                className="h-[16px]"
                disabled={!newBarcode.trim() || newBarcode.trim().length < 3 || isAdding || isConnectedToSale}
              >
                'Add'
              </Button>
            </div>
          </>
      </div>
    </div>
  );
};

export default BarcodeSection; 
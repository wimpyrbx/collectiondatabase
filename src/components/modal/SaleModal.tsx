import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { Card } from '@/components/card';
import { Button, DisplayError } from '@/components/ui';
import { FormElement } from '@/components/formelement/FormElement';
import { SaleViewItem, SALE_STATUSES } from '@/types/sale';
import { FaShoppingCart, FaSave, FaTrash, FaUser, FaCalendar, FaMoneyBillWave, FaBoxes, FaInfoCircle, FaCheck, FaTimes, FaExclamationTriangle, FaStickyNote, FaClock } from 'react-icons/fa';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/utils/notifications';
import { InventoryViewItem } from '@/types/inventory';
import { BaseStyledContainer } from '@/components/ui/BaseStyledContainer';
import { TooltipWrapper } from '@/components/tooltip/TooltipWrapper';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TooltipStyle } from '@/utils/tooltip';
import { Dialog } from '@headlessui/react';
import clsx from 'clsx';
import { getPriceDisplayText, getFinalPrice } from '@/utils/priceUtils';

interface SaleModalProps {
  sale: SaleViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (saleId: number) => void;
  mode: 'create' | 'edit';
}

// Status button configuration
const STATUS_OPTIONS = [
  {
    value: 'Reserved',
    label: 'Reserved',
    shortcut: 'R',
    styles: {
      bgColor: 'bg-yellow-500/20',
      textColor: 'text-yellow-400',
      borderColor: 'ring-yellow-500/50',
      hoverColor: 'hover:bg-yellow-500/30'
    },
    icon: 'clock'
  },
  {
    value: 'Finalized',
    label: 'Finalized',
    shortcut: 'F',
    styles: {
      bgColor: 'bg-green-500/20',
      textColor: 'text-green-400',
      borderColor: 'ring-green-500/50',
      hoverColor: 'hover:bg-green-500/30'
    },
    icon: 'check'
  }
];

// Status button component
const StatusButton: React.FC<{
  option: typeof STATUS_OPTIONS[0];
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ option, isSelected, onClick, disabled = false }) => {
  // Render the appropriate icon based on the option.icon value
  const renderIcon = () => {
    switch (option.icon) {
      case 'clock':
        return <FaClock className="w-4 h-4" />;
      case 'check':
        return <FaCheck className="w-4 h-4" />;
      case 'times':
        return <FaTimes className="w-4 h-4" />;
      default:
        return <FaInfoCircle className="w-4 h-4" />;
    }
  };
  
  return (
    <button
      type="button"
      disabled={disabled || isSelected}
      onClick={onClick}
      className={clsx(
        'flex-1 relative px-4 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2',
        isSelected ? [
          option.styles.bgColor,
          '!bg-opacity-100',
          'ring-1',
          option.styles.borderColor,
          'shadow-lg',
          'shadow-black/30',
          option.styles.textColor
        ] : [
          'bg-gray-800',
          'hover:bg-opacity-80',
          'transition-all duration-200',
          option.styles.hoverColor,
          'text-gray-300'
        ],
        disabled && !isSelected && 'opacity-50 cursor-not-allowed'
      )}
    >
      {renderIcon()}
      <span>{option.label}</span>
      {isSelected && (
        <span className="absolute top-1 right-1 text-xs opacity-70">{option.shortcut}</span>
      )}
    </button>
  );
};

// Create a separate component for sale item rows to properly handle hooks
const SaleItemRow: React.FC<{
  item: InventoryViewItem;
  onRemove: (inventoryId: number) => Promise<void>;
}> = ({ item, onRemove }) => {
  const itemRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <tr 
      className="border-b border-gray-700/30 hover:bg-gray-800/50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <td className="py-2 px-3">
        <div className="flex items-center gap-3">
          {(item as any).image_url ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 shadow-md shadow-black/30 border border-gray-700/50">
              <img 
                src={(item as any).image_url} 
                alt={item.product_title} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 shadow-md shadow-black/30 border border-gray-700/50">
              <FaBoxes className="text-gray-700 w-5 h-5" />
            </div>
          )}
          <div>
            <div className="font-medium text-gray-200 text-sm">
              {item.product_title}
              {item.product_variant && <span className="text-cyan-500/75 ml-1">({item.product_variant})</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.product_type_name}</td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.product_group_name}</td>
      <td className="py-2 px-3 text-xs text-gray-400">{item.region_name}</td>
      <td className="py-2 px-3">
        <div className="text-right font-medium text-blue-400 text-sm">{getPriceDisplayText(item)}</div>
      </td>
      <td className="py-2 px-3 text-right">
        <div ref={itemRef}>
          <BaseStyledContainer
            as="button"
            bgColor="bg-red-500/50"
            iconLeft={<FaTrash className="w-3 h-3" />}
            size="xs"
            elementProps={{
              type: "button",
              onClick: () => onRemove(item.inventory_id)
            }}
          />
        </div>
      </td>
    </tr>
  );
};

export const SaleModal: React.FC<SaleModalProps> = ({
  sale,
  isOpen,
  onClose,
  onSuccess,
  mode = 'edit'
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    buyer_name: '',
    sale_status: 'Reserved',
    sale_notes: '',
    sale_date: new Date().toISOString().split('T')[0]
  });
  const [saleItems, setSaleItems] = useState<InventoryViewItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [initialFormState, setInitialFormState] = useState<any>(null);

  // Initialize form data when sale changes
  useEffect(() => {
    if (sale && mode === 'edit') {
      const newFormData = {
        buyer_name: sale.buyer_name || '',
        sale_status: sale.sale_status === 'Completed' ? 'Finalized' : sale.sale_status || 'Reserved',
        sale_notes: sale.sale_notes || '',
        sale_date: sale.created_at ? new Date(sale.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
      
      setFormData(newFormData);
      setInitialFormState(newFormData);
      setHasFormChanges(false);

      // Fetch sale items
      fetchSaleItems(sale.sale_id);
    } else {
      // Reset form for create mode
      const newFormData = {
        buyer_name: '',
        sale_status: 'Reserved',
        sale_notes: '',
        sale_date: new Date().toISOString().split('T')[0]
      };
      
      setFormData(newFormData);
      setInitialFormState(newFormData);
      setHasFormChanges(mode === 'create'); // Always enable save for new sales
      setSaleItems([]);
    }
  }, [sale, mode, isOpen]);

  // Track form changes
  useEffect(() => {
    if (mode === 'create') return; // Don't track changes for new sales
    
    if (initialFormState && formData) {
      const compareValues = (initial: any, current: any) => {
        const normalizedInitial = initial === null || initial === undefined ? '' : initial.toString();
        const normalizedCurrent = current === null || current === undefined ? '' : current.toString();
        return normalizedInitial !== normalizedCurrent;
      };

      const hasChanges = Object.keys(initialFormState).some(key => {
        const initial = initialFormState[key];
        const current = formData[key as keyof typeof formData]?.toString() || '';
        return compareValues(initial, current);
      });
      
      if (hasFormChanges !== hasChanges) {
        setHasFormChanges(hasChanges);
      }
    }
  }, [formData, initialFormState, mode, hasFormChanges]);

  const fetchSaleItems = async (saleId: number) => {
    setIsLoadingItems(true);
    try {
      // First get the sale items
      const { data: items, error: itemsError } = await supabase
        .from('view_sale_items')
        .select('*')
        .eq('sale_id', saleId);
      
      if (itemsError) throw itemsError;
      
      if (!items || items.length === 0) {
        setSaleItems([]);
        setIsLoadingItems(false);
        return;
      }
      
      // Get inventory details for each item
      const inventoryIds = items.map(item => item.inventory_id);
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('view_inventory')
        .select('*')
        .in('inventory_id', inventoryIds);
      
      if (inventoryError) throw inventoryError;
      
      setSaleItems(inventoryItems || []);
    } catch (error) {
      console.error('Error fetching sale items:', error);
      setErrors(['Failed to load sale items']);
    } finally {
      setIsLoadingItems(false);
    }
  };

  const handleInputChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      if (mode === 'create') {
        // Create new sale
        const { data: newSale, error: createError } = await supabase
          .from('sales')
          .insert({
            buyer_name: formData.buyer_name || null,
            sale_status: formData.sale_status,
            sale_notes: formData.sale_notes || null
          })
          .select()
          .single();
        
        if (createError) throw createError;
        
        if (newSale) {
          notify('success', 'Sale created successfully');
          onSuccess?.(newSale.id);
          onClose();
        }
      } else if (sale) {
        // Update existing sale
        const { error: updateError } = await supabase
          .from('sales')
          .update({
            buyer_name: formData.buyer_name || null,
            sale_status: formData.sale_status,
            sale_notes: formData.sale_notes || null
          })
          .eq('id', sale.sale_id);
        
        if (updateError) throw updateError;
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        
        notify('success', 'Sale updated successfully');
        onSuccess?.(sale.sale_id);
        onClose();
      }
    } catch (error: any) {
      console.error('Error saving sale:', error);
      setErrors([error.message || 'Failed to save sale']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveInventoryItem = async (inventoryId: number) => {
    if (!sale) {
      setErrors(['Cannot remove items from a non-existent sale']);
      return;
    }

    try {
      // Remove item from sale
      const { error: saleItemError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.sale_id)
        .eq('inventory_id', inventoryId);
      
      if (saleItemError) throw saleItemError;
      
      // Update inventory status
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          sale_id: null,
          inventory_status: 'For Sale'
        })
        .eq('id', inventoryId);
      
      if (inventoryError) throw inventoryError;
      
      // Refresh data
      fetchSaleItems(sale.sale_id);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Item removed from sale');
    } catch (error: any) {
      console.error('Error removing item from sale:', error);
      setErrors([error.message || 'Failed to remove item from sale']);
    }
  };

  const handleDeleteSale = async () => {
    if (!sale) return;

    try {
      // First update all inventory items to remove the sale_id
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({ 
          sale_id: null,
          inventory_status: 'For Sale' 
        })
        .eq('sale_id', sale.sale_id);

      if (inventoryError) throw inventoryError;

      // Then delete the sale items
      const { error: saleItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.sale_id);

      if (saleItemsError) throw saleItemsError;

      // Finally delete the sale
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.sale_id);

      if (saleError) throw saleError;

      // Update the cache
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      
      notify('success', 'Sale deleted successfully');
      onClose();
    } catch (error: any) {
      console.error('Error deleting sale:', error);
      setErrors([error.message || 'Failed to delete sale']);
    }
    setIsDeleteConfirmOpen(false);
  };

  const calculateTotal = () => {
    return saleItems.reduce((total, item) => {
      return total + (getFinalPrice(item) || 0);
    }, 0);
  };

  // Handle status button click
  const handleStatusChange = (status: string) => {
    handleInputChange('sale_status', status);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <Card modal className="w-[1000px]">
          <Card.Header
            title={mode === 'create' ? 'Create New Sale' : `Edit Sale #${sale?.sale_id}`}
            icon={<FaShoppingCart />}
            iconColor="text-green-500"
            bgColor="bg-green-500/50"
          />
          <Card.Body>
            <div className="">
              <form onSubmit={handleSubmit} className="space-y-6">
                {errors.length > 0 && <DisplayError errors={errors} />}
                
                <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                  {/* Left Column - Sale Details */}
                  <div className="space-y-6">
                    {/* Status Buttons */}
                    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                        <h3 className="font-medium text-gray-300 flex items-center gap-2">
                          <FaInfoCircle className="text-blue-400" />
                          Sale Status
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="flex gap-4">
                          {STATUS_OPTIONS.map(option => (
                            <StatusButton
                              key={option.value}
                              option={option}
                              isSelected={formData.sale_status === option.value}
                              onClick={() => handleStatusChange(option.value)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormElement
                          elementType="input"
                          label="Buyer Name"
                          labelIcon={<FaUser />}
                          labelIconColor="text-blue-400"
                          initialValue={formData.buyer_name}
                          onValueChange={(value) => handleInputChange('buyer_name', value)}
                          labelPosition="above"
                          placeholder="Enter buyer name"
                        />
                        
                        <FormElement
                          elementType="input"
                          label="Sale Date"
                          labelIcon={<FaCalendar />}
                          labelIconColor="text-yellow-400"
                          initialValue={formData.sale_date}
                          onValueChange={(value) => handleInputChange('sale_date', value)}
                          labelPosition="above"
                          placeholder="YYYY-MM-DD"
                        />
                      </div>
                    
                      <FormElement
                        elementType="textarea"
                        label="Notes"
                        labelIcon={<FaStickyNote />}
                        labelIconColor="text-green-400"
                        initialValue={formData.sale_notes}
                        onValueChange={(value) => handleInputChange('sale_notes', value)}
                        labelPosition="above"
                        placeholder="Enter any notes about this sale"
                        rows={5}
                      />
                    </div>

                    {/* Sale Items Summary */}
                    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
                      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
                        <h3 className="font-medium text-gray-300 flex items-center gap-2">
                          <FaBoxes className="text-blue-400" />
                          Sale Items
                        </h3>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                              <FaBoxes className="text-blue-400 w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Total Items</div>
                              <div className="text-lg font-semibold text-gray-200">{saleItems.length}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500/20 p-2 rounded-lg">
                              <FaMoneyBillWave className="text-blue-400 w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Total Sum</div>
                              <div className="text-lg font-semibold text-blue-400">NOK {calculateTotal().toFixed(0)},-</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Column - Sale Items */}
                  <div className="flex flex-col h-full">
                    <div className="bg-gray-900/40 rounded-t-lg p-3 shadow-md shadow-black/20 border border-gray-700/50 border-b-0">
                      <h3 className="text-lg font-medium text-gray-200 flex items-center gap-2">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <FaBoxes className="text-blue-400 w-5 h-5" />
                        </div>
                        Sale Items List
                      </h3>
                    </div>
                    
                    <div className="bg-gray-800/30 rounded-b-lg border border-gray-700/50 overflow-y-auto shadow-inner shadow-black/20 flex-1 min-h-[350px]">
                      {isLoadingItems ? (
                        <div className="p-4 text-center text-gray-400 h-full flex items-center justify-center">
                          <div>
                            <FaBoxes className="w-8 h-8 text-gray-600 mx-auto mb-2 animate-pulse" />
                            <p>Loading sale items...</p>
                          </div>
                        </div>
                      ) : saleItems.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 bg-gray-800/20 rounded-lg border border-dashed border-gray-700/50 h-full flex items-center justify-center">
                          <div>
                            <FaBoxes className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-lg">No items in this sale yet</p>
                            <p className="text-sm text-gray-500 mt-2">Items can be added to sales from the Inventory page</p>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-700/50">
                            <thead className="bg-gray-900/50">
                              <tr>
                                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Product</th>
                                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Group</th>
                                <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Region</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                                <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody className="bg-gray-800/20 divide-y divide-gray-700/30">
                              {saleItems.map(item => (
                                <SaleItemRow 
                                  key={item.inventory_id}
                                  item={item}
                                  onRemove={handleRemoveInventoryItem}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-between w-full">
              <div>
                {mode === 'edit' && sale && (
                  <Button
                    type="button"
                    bgColor="bg-red-600"
                    iconLeft={<FaTrash className="w-4 h-4" />}
                    onClick={() => setIsDeleteConfirmOpen(true)}
                  >
                    Delete Sale
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  bgColor="bg-gray-700"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  bgColor="bg-blue-600"
                  iconLeft={<FaSave className="w-4 h-4" />}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !hasFormChanges}
                  className={clsx(
                    "transition-colors duration-200",
                    (!hasFormChanges || isSubmitting) && "opacity-50 bg-gray-800/50 cursor-not-allowed"
                  )}
                >
                  {isSubmitting ? 'Saving...' : 'Save Sale'}
                </Button>
              </div>
            </div>
          </Card.Footer>
        </Card>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-all duration-300" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Card modal className="w-[400px]">
            <Card.Header
              icon={<FaTrash />}
              iconColor="text-red-500"
              title="Delete Sale"
              bgColor="bg-red-500/20"
            />
            <Card.Body>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <div className="text-gray-300">
                    <span className="text-gray-400">Sale ID:</span> #{sale?.sale_id}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Buyer:</span> {sale?.buyer_name || 'N/A'}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Status:</span> {sale?.sale_status || 'N/A'}
                  </div>
                  <div className="text-gray-300">
                    <span className="text-gray-400">Items:</span> {saleItems.length}
                  </div>
                </div>
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <FaExclamationTriangle />
                  <span>This action cannot be undone. All items will be returned to inventory.</span>
                </div>
              </div>
            </Card.Body>
            <Card.Footer className="flex justify-end gap-2 bg-gray-900/50">
              <Button
                type="button"
                bgColor="bg-gray-700"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                bgColor="bg-red-900/50"
                iconLeft={<FaTrash />}
                onClick={handleDeleteSale}
              >
                Delete
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </Dialog>
    </>
  );
};

export default SaleModal; 
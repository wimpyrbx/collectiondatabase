import React from 'react';
import Page from '@/components/page/Page';
import { useInventoryCache, useProductsCache } from '@/hooks/viewHooks';
import { InventoryViewItem } from '@/types/inventory';
import { FaBoxes, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaCalendar, FaStar, FaPlus, FaImage, FaStore, FaClock, FaTags, FaShoppingCart, FaShoppingBag } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { InventoryModal } from '@/components/modal/InventoryModal';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { DisplayError, Button } from '@/components/ui';
import { QuickAddInventory } from '@/components/inventory/QuickAddInventory';
import { TagDisplay } from '@/components/tag/TagDisplay';
import { getStatusStyles } from '@/constants/inventory';
import clsx from 'clsx';
import { TooltipWrapper } from '@/components/tooltip/TooltipWrapper';
import { SaleItemWithInventory, SaleViewItem } from '@/types/sale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { PurchaseViewItem } from '@/types/purchase';
import { getPriceDisplayText } from '@/utils/priceUtils';

const Inventory = () => {
  const { data, isLoading, isError, error } = useInventoryCache();
  const [selectedInventory, setSelectedInventory] = React.useState<InventoryViewItem | null>(null);
  const [updatedInventoryId, setUpdatedInventoryId] = React.useState<number | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { data: products = [] } = useProductsCache();
  
  // Fetch all sales and purchases data upfront
  const { data: allSales = {} } = useQuery({
    queryKey: ['all_sales_with_items'],
    queryFn: async () => {
      const { data: sales, error } = await supabase
        .from('view_sales')
        .select('*');
      
      if (error) throw error;
      
      // Create a map of sale_id to sale data
      const salesMap: Record<number, any> = {};
      
      // For each sale, fetch its items
      await Promise.all((sales || []).map(async (sale: SaleViewItem) => {
        // First get the sale items
        const { data: saleItems, error: saleItemsError } = await supabase
          .from('view_sale_items')
          .select('*')
          .eq('sale_id', sale.sale_id);
        
        if (saleItemsError) throw saleItemsError;
        
        // For each sale item, get the inventory details
        const itemsWithInventory = await Promise.all((saleItems || []).map(async (saleItem: any) => {
          const { data: inventory, error: inventoryError } = await supabase
            .from('view_inventory')
            .select('*')
            .eq('inventory_id', saleItem.inventory_id)
            .single();
          
          if (inventoryError && inventoryError.code !== 'PGRST116') {
            console.warn(`Error fetching inventory for sale item ${saleItem.id}:`, inventoryError);
          }
          
          return {
            ...saleItem,
            inventory: inventory || null
          };
        }));
        
        salesMap[sale.sale_id] = {
          ...sale,
          items: itemsWithInventory || []
        };
      }));
      
      return salesMap;
    }
  });
  
  const { data: allPurchases = {} } = useQuery({
    queryKey: ['all_purchases_with_items'],
    queryFn: async () => {
      const { data: purchases, error } = await supabase
        .from('view_purchases')
        .select('*');
      
      if (error) throw error;
      
      // Create a map of purchase_id to purchase data
      const purchasesMap: Record<number, any> = {};
      
      // For each purchase, fetch its items
      await Promise.all((purchases || []).map(async (purchase: PurchaseViewItem) => {
        const { data: items, error: itemsError } = await supabase
          .from('view_inventory')
          .select('*')
          .eq('purchase_id', purchase.purchase_id);
        
        if (itemsError) throw itemsError;
        
        purchasesMap[purchase.purchase_id] = {
          ...purchase,
          items: items || []
        };
      }));
      
      return purchasesMap;
    }
  });

  const columns: Column<InventoryViewItem>[] = [
    {
      key: 'product_group',
      header: 'Group',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '90px',
      accessor: (item: InventoryViewItem) => item.product_group_name || '',
      align: 'left' as const
    },
    {
      key: 'product_type',
      header: 'Type',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '90px',
      accessor: (item: InventoryViewItem) => item.product_type_name || '',
      align: 'left' as const
    },
    {
      key: 'inventory_image',
      header: '',
      icon: <FaImage className="w-4 h-4" />,
      width: '30px',
      accessor: (item: InventoryViewItem) => (
        <ImageDisplay 
          type="inventory" 
          id={item.inventory_id} 
          title={item.product_title} 
          className="object-contain p-0 h-[20px]"
          productId={item.product_id}
        />
      ),
      align: 'center' as const
    },
    {
      key: 'product_title',
      header: 'Product Title',
      icon: <FaTag className="w-4 h-4" />,
      accessor: (item: InventoryViewItem) => {
        // Get sale and purchase data from the pre-fetched maps
        const saleData = item.sale_id ? allSales[item.sale_id] : null;
        const purchaseData = item.purchase_id ? allPurchases[item.purchase_id] : null;
        
        return (
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between w-full">
              <span>{item.product_title} {item.product_variant && <span className="text-sm text-cyan-500/75">({item.product_variant})</span>}</span>
              
              <div className="flex items-center gap-1.5">
                {/* Sale icon with tooltip */}
                {item.sale_id && (
                  <TooltipWrapper 
                    content={
                      <div className="p-2 space-y-3 max-w-xs">
                        <div className="font-semibold text-blue-300 border-b border-gray-700 pb-1">Sale #{item.sale_id}</div>
                        <div className="grid grid-cols-2 gap-x-2 text-sm">
                          <span className="text-gray-400">Status:</span>
                          <span className="text-white">{item.sale_status || 'N/A'}</span>
                          
                          <span className="text-gray-400">Buyer:</span>
                          <span className="text-white">{item.sale_buyer || 'N/A'}</span>
                          
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">{item.sale_date ? new Date(item.sale_date).toLocaleDateString() : 'N/A'}</span>
                          
                          <span className="text-gray-400">Price:</span>
                          <span className="text-white">{item.sold_price ? `NOK ${item.sold_price},-` : 'N/A'}</span>
                        </div>
                        
                        {saleData && saleData.items && saleData.items.length > 0 && (
                          <div className="mt-2">
                            <div className="text-gray-400 text-sm font-semibold border-b border-gray-700 pb-1">Items in this sale:</div>
                            <div className="mt-1 max-h-40 overflow-y-auto">
                              {saleData.items.map((saleItem: SaleItemWithInventory, index: number) => (
                                <div 
                                  key={`sale-item-${saleItem.id}-${index}`} 
                                  className={`text-sm py-1 ${saleItem.inventory_id === item.inventory_id ? 'text-blue-300 font-semibold' : 'text-white'} ${index !== saleData.items.length - 1 ? 'border-b border-gray-700' : ''}`}
                                >
                                  {saleItem.inventory?.product_title}
                                  {saleItem.inventory?.product_variant && ` (${saleItem.inventory.product_variant})`}
                                  {saleItem.price ? ` - NOK ${saleItem.price},-` : saleItem.inventory?.sold_price ? ` - NOK ${saleItem.inventory.sold_price},-` : ''}
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-blue-300 border-t border-gray-700 pt-1">
                              Total: NOK {saleData.total_sold_price},-
                            </div>
                          </div>
                        )}
                        
                        {item.sale_notes && (
                          <div className="mt-2">
                            <span className="text-gray-400 text-sm">Notes:</span>
                            <p className="text-white text-sm mt-1">{item.sale_notes}</p>
                          </div>
                        )}
                      </div>
                    }
                    placement="right"
                    style="minimal"
                  >
                    <div className="flex items-center justify-center p-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors cursor-help">
                      <FaShoppingCart className="w-3 h-3" />
                    </div>
                  </TooltipWrapper>
                )}
                
                {/* Purchase icon with tooltip */}
                {item.purchase_id && (
                  <TooltipWrapper 
                    content={
                      <div className="p-2 space-y-3 max-w-xs">
                        <div className="font-semibold text-green-300 border-b border-gray-700 pb-1">Purchase #{item.purchase_id}</div>
                        <div className="grid grid-cols-2 gap-x-2 text-sm">
                          <span className="text-gray-400">Seller:</span>
                          <span className="text-white">{item.purchase_seller || 'N/A'}</span>
                          
                          <span className="text-gray-400">Origin:</span>
                          <span className="text-white">{item.purchase_origin || 'N/A'}</span>
                          
                          <span className="text-gray-400">Date:</span>
                          <span className="text-white">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</span>
                          
                          <span className="text-gray-400">Cost:</span>
                          <span className="text-white">{item.purchase_cost ? `NOK ${item.purchase_cost},-` : 'N/A'}</span>
                        </div>
                        
                        {purchaseData && purchaseData.items && purchaseData.items.length > 0 && (
                          <div className="mt-2">
                            <div className="text-gray-400 text-sm font-semibold border-b border-gray-700 pb-1">Items in this purchase:</div>
                            <div className="mt-1 max-h-40 overflow-y-auto">
                              {purchaseData.items.map((inventoryItem: InventoryViewItem, index: number) => (
                                <div 
                                  key={`purchase-item-${inventoryItem.inventory_id}-${index}`} 
                                  className={`text-sm py-1 ${inventoryItem.inventory_id === item.inventory_id ? 'text-green-300 font-semibold' : 'text-white'} ${index !== purchaseData.items.length - 1 ? 'border-b border-gray-700' : ''}`}
                                >
                                  {inventoryItem.product_title}
                                  {inventoryItem.product_variant && ` (${inventoryItem.product_variant})`}
                                  {` - ${getPriceDisplayText(inventoryItem)}`}
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-sm font-semibold text-green-300 border-t border-gray-700 pt-1">
                              Total Items: {purchaseData.items.length}
                              {purchaseData.total_cost > 0 && ` - Cost: NOK ${purchaseData.total_cost},-`}
                            </div>
                          </div>
                        )}
                        
                        {item.purchase_notes && (
                          <div className="mt-2">
                            <span className="text-gray-400 text-sm">Notes:</span>
                            <p className="text-white text-sm mt-1">{item.purchase_notes}</p>
                          </div>
                        )}
                      </div>
                    }
                    placement="right"
                    style="minimal"
                  >
                    <div className="flex items-center justify-center p-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-help">
                      <FaShoppingBag className="w-3 h-3" />
                    </div>
                  </TooltipWrapper>
                )}
              </div>
            </div>
          </div>
        );
      },
      align: 'left' as const,
      sortable: true,
      sortKey: 'product_title'
    },
    {
      key: 'release_year',
      header: 'Year',
      icon: <FaCalendar className="w-4 h-4" />,
      width: '80px',
      accessor: (item: InventoryViewItem) => item.release_year || '',
      align: 'left' as const
    },
    {
      key: 'region_name',
      header: 'Region',
      icon: <FaGlobe className="w-4 h-4" />,
      width: '100px',
      accessor: (item: InventoryViewItem) => {
        const region = regionsData.regions.find(r => r.name === item.region_name);
        return (
          <div className="flex items-center space-x-2">
            <span>{region?.display_name || item.region_name || ''}</span>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'inventory_status',
      header: 'Status',
      icon: <FaStore className="w-4 h-4" />,
      width: '100px',
      accessor: (item: InventoryViewItem) => {
        const styles = getStatusStyles(item.inventory_status);
        return (
          <span className={clsx(
            'px-2 py-0.5 rounded-full text-xs',
            styles.bgColor,
            styles.textColor
          )}>
            {item.inventory_status}
          </span>
        );
      },
      sortable: true
    },
    {
      key: 'tags',
      header: 'Tags',
      icon: <FaTags className="w-4 h-4" />,
      width: '200px',
      accessor: (item: InventoryViewItem) => {
        // Combine both inventory and product tags, ensuring no duplicates by id
        const allTags = [
          ...(item.tags || []),
          ...(item.product_tags || [])
        ].filter((tag, index, self) => 
          index === self.findIndex(t => t.id === tag.id)
        ).sort((a, b) => a.name.localeCompare(b.name));

        return (
          <div className="flex flex-wrap gap-1">
            {allTags.map(tag => (
              <TagDisplay
                key={`${tag.id}-${tag.name}`}
                tag={tag}
                size="xs"
              />
            ))}
          </div>
        );
      },
      align: 'left' as const
    },
    {
      key: 'final_price',
      header: 'Price',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '100px',
      accessor: (item: InventoryViewItem) => getPriceDisplayText(item),
      sortable: true,
      sortKey: 'final_price',
      align: 'left' as const
    }
  ];

  const getFilterConfigs = React.useCallback((data: InventoryViewItem[]) => {
    // Create Maps for faster lookups
    const typeMap = new Map<string, number>();
    const groupMap = new Map<string, number>();
    const statusMap = new Map<string, number>();
    const inventoryTagMap = new Map<string, number>();
    const productTagMap = new Map<string, number>();

    // Single pass through data to count all values
    data.forEach(item => {
      if (item.product_type_name) {
        typeMap.set(item.product_type_name, (typeMap.get(item.product_type_name) || 0) + 1);
      }
      if (item.product_group_name) {
        groupMap.set(item.product_group_name, (groupMap.get(item.product_group_name) || 0) + 1);
      }
      if (item.inventory_status) {
        statusMap.set(item.inventory_status, (statusMap.get(item.inventory_status) || 0) + 1);
      }
      // Count inventory tags
      item.tags?.forEach(tag => {
        inventoryTagMap.set(tag.name, (inventoryTagMap.get(tag.name) || 0) + 1);
      });
      // Count product tags
      item.product_tags?.forEach(tag => {
        productTagMap.set(tag.name, (productTagMap.get(tag.name) || 0) + 1);
      });
    });

    return [
      {
        key: 'product_type_name',
        label: 'Product Type',
        options: Array.from(typeMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        }))
      },
      {
        key: 'product_group_name',
        label: 'Product Group',
        options: Array.from(groupMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        }))
      },
      {
        key: 'inventory_status',
        label: 'Status',
        options: Array.from(statusMap.entries()).map(([value, count]) => ({
          value,
          label: value.replace('_', ' '),
          count
        }))
      },
      {
        key: 'tag_inventory',
        label: 'Inventory Tags',
        options: Array.from(inventoryTagMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        }))
      },
      {
        key: 'tag_product',
        label: 'Product Tags',
        options: Array.from(productTagMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        }))
      }
    ];
  }, []);

  const tableState = useTableState({
    initialSort: 'product_title',
    data: data || [],
    getFilterConfigs
  });

  const handleInventoryUpdate = (inventory: InventoryViewItem) => {
    setSelectedInventory(inventory);
    setUpdatedInventoryId(null);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedInventory(null);
    setIsCreating(false);
    setIsModalOpen(false);
  };

  const handleSuccess = (inventoryId: number) => {
    setUpdatedInventoryId(inventoryId);
    setTimeout(() => {
      setUpdatedInventoryId(null);
    }, 1500);
  };

  const handleAddSuccess = (inventoryId: number) => {
    if (tableState.pagination.currentPage !== 1) {
      tableState.pagination.onPageChange(1);
    }
  };

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    
    return data.filter(item => {
      // Apply filters
      const filtersPassed = Object.entries(tableState.selectedFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        
        if (key === 'tag_inventory') {
          // For inventory tags, check if the item has any of the selected tags
          return values.some(value => 
            item.tags?.some(tag => tag.name === value)
          );
        }
        
        if (key === 'tag_product') {
          // For product tags, check if the item has any of the selected tags
          return values.some(value => 
            item.product_tags?.some(tag => tag.name === value)
          );
        }
        
        // Handle recent updates filter
        if (key === 'recent_updates') {
          const secondsAgo = item.inventory_updated_at ? 
            Math.floor((Date.now() - new Date(item.inventory_updated_at).getTime()) / 1000) : 
            Number.MAX_SAFE_INTEGER;
          if (values.includes('recent')) {
            return secondsAgo <= 3600; // 1 hour = 3600 seconds
          }
          return true;
        }
        
        // For other filters, use the existing logic
        const itemValue = item[key as keyof InventoryViewItem];
        return values.includes(String(itemValue));
      });

      // Apply search
      const searchPassed = !tableState.searchTerm || 
        item.product_title.toLowerCase().includes(tableState.searchTerm.toLowerCase()) ||
        (item.product_variant && item.product_variant.toLowerCase().includes(tableState.searchTerm.toLowerCase()));

      return filtersPassed && searchPassed;
    });
  }, [data, tableState.selectedFilters, tableState.searchTerm]);

  return (
    <Page
      title="Inventory"
      icon={<FaBoxes />}
      bgColor="bg-gray-800"
      iconColor="text-cyan-500"
      subtitle="Manage your inventory items"
    >
      <Card className="w-full">
        <Card.Header
          title="Inventory"
          icon={<FaBoxes />}
          iconColor="text-cyan-500"
          collapsible={true}
          rightContent={
            <QuickAddInventory
              products={products ?? []}
              onSuccess={handleAddSuccess}
            />
          }
        />
        <Card.Body>
          <BaseFilterableTable<InventoryViewItem>
            columns={columns}
            data={filteredData}
            keyExtractor={(item) => item.inventory_id ? item.inventory_id.toString() : 'undefined-id'}
            isLoading={isLoading}
            error={error}
            filters={tableState.filters.filter(filter => 
              // Only include filters that have more than one option
              filter.options.length > 1 || 
              // Always include tag filters if there are any tags
              (filter.key === 'tag_inventory' && filter.options.length > 0) ||
              (filter.key === 'tag_product' && filter.options.length > 0)
            )}
            selectedFilters={tableState.selectedFilters}
            onFilterChange={tableState.onFilterChange}
            searchTerm={tableState.searchTerm}
            onSearchChange={tableState.onSearchChange}
            sortBy={tableState.sortBy}
            sortDirection={tableState.sortDirection}
            onSort={tableState.onSort}
            pagination={tableState.pagination}
            onRowClick={handleInventoryUpdate}
            updatedId={updatedInventoryId}
            isModalOpen={isModalOpen}
            fixedHeight="h-[36px]"
            navigationLocation="top"
            updateAgeColumn="inventory_updated_at"
            rowClassName={(item: InventoryViewItem) => 
              selectedInventory?.inventory_id === item.inventory_id && isModalOpen 
                ? '!bg-cyan-500/20 transition-colors duration-200' 
                : ''
            }
          />
        </Card.Body>
      </Card>

      {isModalOpen && (
        <InventoryModal
          inventory={selectedInventory}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onUpdateSuccess={handleSuccess}
          mode={isCreating ? 'create' : 'edit'}
          tableData={filteredData}
          onNavigate={(inventoryId) => {
            const inventory = data?.find(i => i.inventory_id === inventoryId);
            if (inventory) {
              setSelectedInventory(inventory);
            }
          }}
          currentPage={tableState.pagination.currentPage}
          onPageChange={tableState.pagination.onPageChange}
          pageSize={tableState.pagination.pageSize}
        />
      )}
    </Page>
  );
}

export default Inventory; 
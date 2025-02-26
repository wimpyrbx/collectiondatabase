import React from 'react';
import Page from '@/components/page/Page';
import { useInventoryCache, useProductsCache } from '@/hooks/viewHooks';
import { InventoryViewItem } from '@/types/inventory';
import { FaBoxes, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaCalendar, FaStar, FaPlus, FaImage, FaStore, FaClock, FaTags } from 'react-icons/fa';
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

const Inventory = () => {
  const { data, isLoading, isError, error } = useInventoryCache();
  const [selectedInventory, setSelectedInventory] = React.useState<InventoryViewItem | null>(null);
  const [updatedInventoryId, setUpdatedInventoryId] = React.useState<number | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const { data: products = [] } = useProductsCache();

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
      accessor: (item: InventoryViewItem) => (
        <div className="flex flex-col">
          <span>{item.product_title} {item.product_variant && <span className="text-sm text-cyan-500/75">({item.product_variant})</span>}</span>
        </div>
      ),
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
      accessor: (item: InventoryViewItem) => (
        <span className={`px-2 py-0.5 rounded-full text-xs ${
          item.inventory_status === 'FOR_SALE' ? 'bg-green-500/20 text-green-300' :
          item.inventory_status === 'SOLD' ? 'bg-blue-500/20 text-blue-300' :
          'bg-gray-500/20 text-gray-300'
        }`}>
          {item.inventory_status.replace('_', ' ')}
        </span>
      ),
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
      accessor: (item: InventoryViewItem) => item.final_price ? `NOK ${item.final_price.toFixed(0)},-` : '',
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
    setSelectedInventory(null);
    setIsCreating(false);
    setUpdatedInventoryId(inventoryId);
    setTimeout(() => {
      setUpdatedInventoryId(null);
    }, 1500);
    setIsModalOpen(false);
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
            filters={tableState.filters}
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
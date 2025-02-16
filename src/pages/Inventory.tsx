import React from 'react';
import Page from '@/components/page/Page';
import { useInventoryCache, useProductsCache } from '@/hooks/viewHooks';
import { InventoryViewItem } from '@/types/inventory';
import { FaBoxes, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaCalendar, FaStar, FaPlus, FaImage, FaStore } from 'react-icons/fa';
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
    const uniqueTypes = Array.from(new Set(data.map(item => item.product_type_name ?? ''))).filter(Boolean) as string[];
    const uniqueGroups = Array.from(new Set(data.map(item => item.product_group_name ?? ''))).filter(Boolean) as string[];
    const uniqueStatuses = Array.from(new Set(data.map(item => item.inventory_status))).filter(Boolean) as string[];

    return [
      {
        key: 'product_type_name',
        label: 'Product Type',
        options: uniqueTypes.map(type => ({
          value: type,
          label: type,
          count: data.filter(item => item.product_type_name === type).length
        }))
      },
      {
        key: 'product_group_name',
        label: 'Product Group',
        options: uniqueGroups.map(group => ({
          value: group,
          label: group,
          count: data.filter(item => item.product_group_name === group).length
        }))
      },
      {
        key: 'inventory_status',
        label: 'Status',
        options: uniqueStatuses.map(status => ({
          value: status,
          label: status.replace('_', ' '),
          count: data.filter(item => item.inventory_status === status).length
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
              products={products}
              onSuccess={handleAddSuccess}
            />
          }
        />
        <Card.Body>
          <BaseFilterableTable<InventoryViewItem>
            columns={columns}
            data={tableState.currentPageData}
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
            rowClassName={(item: InventoryViewItem) => 
              selectedInventory?.inventory_id === item.inventory_id && isModalOpen 
                ? '!bg-cyan-500/20 transition-colors duration-200' 
                : ''
            }
          />
        </Card.Body>
      </Card>

      <InventoryModal
        inventory={selectedInventory}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdateSuccess={handleSuccess}
        mode={isCreating ? 'create' : 'edit'}
        tableData={tableState.filteredAndSortedData}
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
    </Page>
  );
}

export default Inventory; 
import React from 'react';
import Page from '@/components/page/Page';
import { useInventoryCache } from '@/hooks/useInventoryCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { InventoryViewItem } from '@/types/inventory';
import { FaTag, FaBoxes, FaDollarSign, FaLayerGroup, FaGlobe, FaStar, FaTags, FaCalendar, FaStore } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { InventoryModal } from '@/components/modal/InventoryModal';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';

const Inventory = () => {
  const { data, isLoading, isError, error } = useInventoryCache();
  const { getInventoryTags, getInventoryWithProductTags } = useTagsCache();
  const [selectedInventory, setSelectedInventory] = React.useState<InventoryViewItem | null>(null);
  const [updatedInventoryId, setUpdatedInventoryId] = React.useState<number | null>(null);

  const columns: Column<InventoryViewItem>[] = [
    {
      key: 'product_type_and_group',
      header: 'Type/Group',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '100px',
      accessor: (item: InventoryViewItem) => {
        const typeInfo = getProductTypeInfo(item.product_type_name, productTypesData.types);
        
        return (
          <div className="flex items-center space-x-2">
            {typeInfo.imagePath && (
              <img 
                src={typeInfo.imagePath} 
                alt={typeInfo.displayName} 
                className="h-4 w-auto"
                title={typeInfo.displayName}
              />
            )}
            <span className="text-xs">{item.product_group_name}</span>
          </div>
        );
      },
      sortable: false
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
      sortable: true,
      tooltip: {
        text: 'Click to sort by product title',
        style: 'minimal'        
      }
    },
    {
      key: 'release_year',
      header: 'Year',
      icon: <FaCalendar className="w-4 h-4" />,
      width: '80px',
      accessor: (item: InventoryViewItem) => item.release_year || '',
      sortable: true,
      align: 'center' as const
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
      key: 'rating_name',
      header: 'Rating',
      icon: <FaStar className="w-4 h-4" />,
      width: '150px',
      accessor: (item: InventoryViewItem) => {
        const ratingInfo = getRatingDisplayInfo(item.region_name, item.rating_name, regionsData.regions);

        return (
          <div className="flex items-center space-x-2">
            {ratingInfo.imagePath && (
              <img 
                src={ratingInfo.imagePath} 
                alt={ratingInfo.displayName} 
                className="h-6 w-auto"
                title={ratingInfo.displayName}
              />
            )}
            <span className="text-sm text-gray-300">{item.rating_name || ''}</span>
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
    },
    {
      key: 'tags',
      header: 'Tags',
      icon: <FaTags className="w-4 h-4" />,
      width: '200px',
      accessor: (item: InventoryViewItem) => {
        const { inventoryTags, productTags } = getInventoryWithProductTags(item.inventory_id, item.product_id);
        if (!inventoryTags?.length && !productTags?.length) return '';
        
        return (
          <div className="flex flex-wrap gap-1">
            {inventoryTags?.map((tag: string) => (
              <span 
                key={`inv-${tag}`} 
                className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-300"
                title="Inventory Tag"
              >
                {tag}
              </span>
            ))}
            {productTags?.map((tag: string) => (
              <span 
                key={`prod-${tag}`} 
                className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-300"
                title="Product Tag"
              >
                {tag}
              </span>
            ))}
          </div>
        );
      },
      sortable: false
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
    getFilterConfigs: getFilterConfigs
  });

  const handleInventoryUpdate = (inventory: InventoryViewItem) => {
    setSelectedInventory(inventory);
    setUpdatedInventoryId(null);
  };

  const handleModalClose = () => {
    setSelectedInventory(null);
  };

  const handleUpdateSuccess = (inventoryId: number) => {
    setSelectedInventory(null);
    setUpdatedInventoryId(inventoryId);
    // Clear the animation after it plays
    setTimeout(() => {
      setUpdatedInventoryId(null);
    }, 1500); // 1.5s to match animation duration
  };

  return (
    <Page
      title="Inventory"
      icon={<FaBoxes />}
      bgColor="bg-gray-800"
      iconColor="text-cyan-500"
      subtitle="Manage your inventory items"
    >
      <Card
        className="w-full"
      >
        <Card.Header
          title="Inventory"
          icon={<FaBoxes />}
          iconColor="text-cyan-500"
          collapsible={true}
        />
        <Card.Body>
          <BaseFilterableTable<InventoryViewItem>
            columns={columns}
            data={tableState.currentPageData}
            keyExtractor={(item) => item.inventory_id.toString()}
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
            isModalOpen={selectedInventory !== null}
          />
        </Card.Body>
      </Card>

      <InventoryModal
        inventory={selectedInventory}
        isOpen={selectedInventory !== null}
        onClose={handleModalClose}
      />
    </Page>
  );
}

export default Inventory; 
// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useInventory } from '@/hooks/useInventory';
import { InventoryViewItem } from '@/types/inventory';
import { FaBox } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';

const Home = () => {
  const { data, isLoading, isError, error } = useInventory();

  const columns: Column<InventoryViewItem>[] = [
    {
      key: 'product_title',
      header: 'Product Title',
      accessor: (item: InventoryViewItem) => item.product_title,
      sortable: true,
      tooltip: {
        text: 'Click to sort by product title'
      }
    },
    {
      key: 'product_variant',
      header: 'Variant',
      accessor: (item: InventoryViewItem) => item.product_variant,
      sortable: true
    },
    {
      key: 'final_price',
      header: 'Price',
      accessor: (item: InventoryViewItem) => `$${item.final_price.toFixed(2)}`,
      sortable: true,
      sortKey: 'final_price',
      align: 'right' as const
    },
    {
      key: 'inventory_status',
      header: 'Status',
      accessor: (item: InventoryViewItem) => item.inventory_status,
      sortable: true
    },
    {
      key: 'product_group_name',
      header: 'Group',
      accessor: (item: InventoryViewItem) => item.product_group_name,
      sortable: true
    }
  ];

  const getFilterConfigs = React.useCallback((data: InventoryViewItem[]) => {
    const uniqueStatuses = Array.from(new Set(data.map(item => item.inventory_status)));
    const uniqueGroups = Array.from(new Set(data.map(item => item.product_group_name)));
    const uniqueVariants = Array.from(new Set(data.map(item => item.product_variant))).filter(Boolean);

    return [
      {
        key: 'inventory_status',
        label: 'Status',
        options: uniqueStatuses.map(status => ({
          value: status,
          label: status,
          count: data.filter(item => item.inventory_status === status).length
        }))
      },
      {
        key: 'product_variant',
        label: 'Variant',
        options: [
          {
            value: '',
            label: '(No Variant)',
            count: data.filter(item => !item.product_variant || item.product_variant.trim() === '').length
          },
          ...uniqueVariants.map(variant => ({
            value: variant,
            label: variant,
            count: data.filter(item => item.product_variant === variant).length
          }))
        ]
      },
      {
        key: 'product_group_name',
        label: 'Group',
        options: uniqueGroups.map(group => ({
          value: group,
          label: group,
          count: data.filter(item => item.product_group_name === group).length
        }))
      }
    ];
  }, []);

  const tableState = useTableState({
    initialSort: 'product_title',
    data: data || [],
    getFilterConfigs
  });

  return (
    <Page
      title="Inventory"
      icon={<FaBox />}
      bgColor="bg-gray-800"
      iconColor="text-red-500"
      subtitle="Manage your inventory items"
    >
      <Card
        className="w-full"
      >
        <Card.Header
          title="Inventory"
        />
        <Card.Body>
          <BaseFilterableTable<InventoryViewItem>
            columns={columns}
            data={tableState.currentPageData}
            keyExtractor={(item) => item.inventory_id}
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
            onRowClick={(item) => {
              console.log('Clicked item:', item);
            }}
          />
        </Card.Body>
      </Card>
    </Page>
  );
};

export default Home;
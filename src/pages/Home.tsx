// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useProducts } from '@/hooks/useProducts';
import { ProductViewItem } from '@/types/product';
import { FaListAlt, FaTag, FaBoxes, FaDollarSign, FaLayerGroup, FaCubes } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';

const Home = () => {
  const { data, isLoading, isError, error } = useProducts();

  const columns: Column<ProductViewItem>[] = [
    {
      key: 'product_title',
      header: 'Product Title',
      icon: <FaTag className="w-4 h-4" />,
      accessor: (item: ProductViewItem) => item.product_title,
      sortable: true,
      tooltip: {
        text: 'Click to sort by product title',
        style: 'minimal'        
      }
    },
    {
      key: 'product_variant',
      header: 'Variant',
      icon: <FaBoxes className="w-4 h-4" />,
      width: '200px',
      accessor: (item: ProductViewItem) => item.product_variant,
      sortable: true
    },
    {
      key: 'final_price',
      header: 'Price',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '10px',
      accessor: (item: ProductViewItem) => `NOK ${item.final_price.toFixed(0)},-`,
      sortable: true,
      sortKey: 'final_price',
      align: 'left' as const
    },
    {
      key: 'product_type_name',
      header: 'Type',
      icon: <FaCubes className="w-4 h-4" />,
      width: '10px',
      accessor: (item: ProductViewItem) => item.product_type_name,
      sortable: true
    },
    {
      key: 'product_group_name',
      header: 'Group',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '10px',
      accessor: (item: ProductViewItem) => item.product_group_name,
      sortable: true
    }
  ];

  const getFilterConfigs = React.useCallback((data: ProductViewItem[]) => {
    const uniqueTypes = Array.from(new Set(data.map(item => item.product_type_name)));
    const uniqueGroups = Array.from(new Set(data.map(item => item.product_group_name)));
    const uniqueVariants = Array.from(new Set(data.map(item => item.product_variant))).filter(Boolean);

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
      title="Products"
      icon={<FaListAlt />}
      bgColor="bg-gray-800"
      iconColor="text-orange-500"
      subtitle="Manage your products"
    >
      <Card
        className="w-full"
      >
        <Card.Header
          title="Products"
          icon={<FaListAlt />}
          iconColor="text-orange-500"
          collapsible={true}
        />
        <Card.Body>
          <BaseFilterableTable<ProductViewItem>
            columns={columns}
            data={tableState.currentPageData}
            keyExtractor={(item) => item.product_id}
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
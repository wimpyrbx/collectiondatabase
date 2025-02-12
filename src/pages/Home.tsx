// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useProductsCache } from '@/hooks/useProductsCache';
import { ProductViewItem } from '@/types/product';
import { FaListAlt, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaCalendar, FaStar, FaPlus, FaImage } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { ProductModal } from '@/components/modal/ProductModal';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { DisplayError, Button } from '@/components/ui';

const Home = () => {
  const { data, isLoading, isError, error } = useProductsCache();
  const [selectedProduct, setSelectedProduct] = React.useState<ProductViewItem | null>(null);
  const [updatedProductId, setUpdatedProductId] = React.useState<number | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);

  const columns: Column<ProductViewItem>[] = [
    {
      key: 'product_group',
      header: 'Group',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '90px',
      accessor: (item: ProductViewItem) => item.product_group_name || '',
      align: 'left' as const
    },
    {
      key: 'product_type',
      header: 'Type',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '90px',
      accessor: (item: ProductViewItem) => item.product_type_name || '',
      align: 'left' as const
    },
    // show image if it exists in front of the title
    {
      key: 'product_image',
      header: '',
      icon: <FaImage className="w-4 h-4" />,
      width: '30px',
      accessor: (item: ProductViewItem) => item.product_id ? <ImageDisplay type="product" id={item.product_id} title={item.product_title} className="object-contain p-0 h-[20px]" /> : '',
      align: 'center' as const
    },
    {
      key: 'product_title',
      header: 'Product Title',
      icon: <FaTag className="w-4 h-4" />,
      accessor: (item: ProductViewItem) => item.product_title || '',
      align: 'left' as const,
      sortable: true,
      sortKey: 'product_title'
    },
    {
      key: 'product_variant',
      header: 'Variant',
      icon: <FaLayerGroup className="w-4 h-4" />,
      accessor: (item: ProductViewItem) => item.product_variant || '',
      align: 'left' as const,
      sortable: true,
      sortKey: 'product_variant'
    },
    {
      key: 'release_year',
      header: 'Year',
      icon: <FaCalendar className="w-4 h-4" />,
      width: '80px',
      accessor: (item: ProductViewItem) => item.release_year || '',
      align: 'left' as const
    },
    {
      key: 'region_name',
      header: 'Region',
      icon: <FaGlobe className="w-4 h-4" />,
      width: '100px',
      accessor: (item: ProductViewItem) => {
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
      key: 'final_price',
      header: 'Price',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '10px',
      accessor: (item: ProductViewItem) => item.final_price ? `NOK ${item.final_price.toFixed(0)},-` : '',
      sortable: true,
      sortKey: 'final_price',
      align: 'left' as const
    }
  ];

  const getFilterConfigs = React.useCallback((data: ProductViewItem[]) => {
    const uniqueTypes = Array.from(new Set(data.map(item => item.product_type_name ?? ''))).filter(Boolean) as string[];
    const uniqueGroups = Array.from(new Set(data.map(item => item.product_group_name ?? ''))).filter(Boolean) as string[];
    const uniqueVariants = Array.from(new Set(data.map(item => item.product_variant ?? ''))).filter(Boolean) as string[];

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
            value: 'none',
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

  const handleProductUpdate = (product: ProductViewItem) => {
    setSelectedProduct(product);
    setUpdatedProductId(null);
    setIsCreating(false);
  };

  const handleModalClose = () => {
    setSelectedProduct(null);
    setIsCreating(false);
  };

  const handleSuccess = (productId: number) => {
    setSelectedProduct(null);
    setIsCreating(false);
    setUpdatedProductId(productId);
    setTimeout(() => {
      setUpdatedProductId(null);
    }, 1500);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsCreating(true);
  };

  return (
    <Page
      title="Products"
      icon={<FaListAlt />}
      bgColor="bg-gray-800"
      iconColor="text-orange-500"
      subtitle="Manage your products"
    >
      <Card className="w-full">
        <Card.Header
          title="Products"
          icon={<FaListAlt />}
          iconColor="text-orange-500"
          collapsible={true}
          rightContent={
            <Button
              onClick={handleCreateNew}
              bgColor="bg-green-900"
              iconLeft={<FaPlus />}
              type="button"
              className="w-32"
            >
              New Product
            </Button>
          }
        />
        <Card.Body>
          <BaseFilterableTable<ProductViewItem>
            columns={columns}
            data={tableState.currentPageData}
            keyExtractor={(item) => item.product_id.toString()}
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
            onRowClick={handleProductUpdate}
            updatedId={updatedProductId}
            isModalOpen={selectedProduct !== null || isCreating}
            fixedHeight="h-[36px]"
            navigationLocation="top"
          />
        </Card.Body>
      </Card>

      <ProductModal
        product={selectedProduct}
        isOpen={selectedProduct !== null || isCreating}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        mode={isCreating ? 'create' : 'edit'}
      />
    </Page>
  );
}

export default Home;
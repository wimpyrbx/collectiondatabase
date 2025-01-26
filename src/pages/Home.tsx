// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useProductsCache } from '@/hooks/useProductsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { ProductViewItem } from '@/types/product';
import { FaListAlt, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaTags, FaCalendar } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { ProductModal } from '@/components/modal/ProductModal';
import regionsData from '@/data/regions.json';
import productTypesData from '@/data/product_types.json';
import { getRatingDisplayInfo, getProductTypeInfo } from '@/utils/productUtils';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import Pill from '@/components/ui/Pill';
import { BaseTag } from '@/types/tags';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { DisplayError } from '@/components/ui';
import DisplayTags from '@/components/tag/DisplayTags';

const Home = () => {
  const { data, isLoading, isError, error } = useProductsCache();
  const { getTags } = useTagsCache();
  const { data: availableTags = [] } = useProductTagsCache();
  const [selectedProduct, setSelectedProduct] = React.useState<ProductViewItem | null>(null);
  const [updatedProductId, setUpdatedProductId] = React.useState<number | null>(null);

  const columns: Column<ProductViewItem>[] = [
    {
      key: 'type',
      header: 'Type/Group',
      icon: <FaLayerGroup className="w-4 h-4" />,
      width: '100px',
      accessor: (item) => {
        const typeInfo = getProductTypeInfo(item.product_type_name, productTypesData.types);
        return (
          <div className="flex items-center gap-2">
            {typeInfo.imagePath && (
              <img
                src={typeInfo.imagePath}
                alt={typeInfo.displayName}
                className="w-4 h-4"
              />
            )}
            <span className="text-xs">{item.product_group_name}</span>
          </div>
        );
      }
    },
    {
      key: 'product_title',
      header: 'Product Title',
      icon: <FaTag className="w-4 h-4" />,
      accessor: (item: ProductViewItem) => (
        <div className="grid grid-cols-[40px_1fr] gap-2 items-center">
          <div className="w-[40px] flex items-center justify-center">
            <ImageDisplay
              type="product"
              id={item.product_id}
              title={item.product_title}
              className="max-h-[40px] object-contain p-0"
              showTooltip={true}
            />
          </div>
          <div>
            <span>{item.product_title}</span>
            {item.product_variant && (
              <span className="text-sm text-cyan-500/75">
                ({item.product_variant})
              </span>
            )}
          </div>
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
      accessor: (item: ProductViewItem) => item.release_year || '',
      sortable: true,
      align: 'center' as const
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
      key: 'rating',
      header: 'Rating',
      width: '100px',
      accessor: (item) => {
        const ratingInfo = getRatingDisplayInfo(item.region_name, item.rating_name, regionsData.regions);
        return (
          <div className="flex items-center gap-2">
            {ratingInfo.imagePath && (
              <img
                src={ratingInfo.imagePath}
                alt={ratingInfo.displayName}
                className="h-6"
              />
            )}
            <span>{ratingInfo.displayName}</span>
          </div>
        );
      }
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
    },
    {
      key: 'tags',
      header: 'Tags',
      icon: <FaTags className="w-4 h-4" />,
      width: '200px',
      accessor: (item: ProductViewItem) => {
        const tags = getTags(item.product_id, 'products');
        if (!tags || tags.length === 0) return '';
        return <DisplayTags id={item.product_id} tagScope="products" />;
      },
      sortable: false
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
    getFilterConfigs: getFilterConfigs
  });

  const handleProductUpdate = (product: ProductViewItem) => {
    setSelectedProduct(product);
    setUpdatedProductId(null);
  };

  const handleModalClose = () => {
    setSelectedProduct(null);
  };

  const handleUpdateSuccess = (productId: number) => {
    setSelectedProduct(null);
    setUpdatedProductId(productId);
    // Clear the animation after it plays
    setTimeout(() => {
      setUpdatedProductId(null);
    }, 1500); // Increased to 1.5s to match animation duration
  };

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
            isModalOpen={selectedProduct !== null}
          />
        </Card.Body>
      </Card>

      <ProductModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={handleModalClose}
        onUpdateSuccess={handleUpdateSuccess}
      />
    </Page>
  );
}

export default Home;
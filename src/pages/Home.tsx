// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useProductsCache } from '@/hooks/useProductsCache';
import { ProductViewItem } from '@/types/product';
import { FaListAlt, FaTag, FaBoxes, FaDollarSign, FaLayerGroup, FaCubes, FaGlobe, FaStar } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { ProductModal } from '@/components/modal/ProductModal';
import regionsData from '@/data/regions.json';

const Home = () => {
  const { data, isLoading, isError, error } = useProductsCache();
  const [selectedProduct, setSelectedProduct] = React.useState<ProductViewItem | null>(null);

  // Helper function to find rating image path
  const getRatingImagePath = React.useCallback((regionName: string | null, ratingName: string | null): string | null => {
    if (!regionName || !ratingName) return null;
    
    const region = regionsData.regions.find(r => r.name === regionName);
    if (!region) return null;

    // Normalize rating name (e.g., "PEGI 16" -> "PEGI_16")
    const normalizedRatingName = ratingName.replace(' ', '_');

    for (const system of region.rating_systems) {
      const rating = system.ratings.find(r => r.name === normalizedRatingName);
      if (rating) {
        return rating.image_path;
      }
    }
    return null;
  }, []);

  const getRatingDisplayInfo = React.useCallback((regionName: string | null, ratingName: string | null): { displayName: string, imagePath: string | null } => {
    if (!regionName || !ratingName) return { displayName: '', imagePath: null };
    
    const region = regionsData.regions.find(r => r.name === regionName);
    if (!region) return { displayName: ratingName, imagePath: null };

    // Normalize rating name (e.g., "PEGI 16" -> "PEGI_16")
    const normalizedRatingName = ratingName.replace(' ', '_');

    for (const system of region.rating_systems) {
      const rating = system.ratings.find(r => r.name === normalizedRatingName);
      if (rating) {
        return {
          displayName: rating.display_name,
          imagePath: rating.image_path
        };
      }
    }
    return { displayName: ratingName, imagePath: null };
  }, []);

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
      key: 'rating_name',
      header: 'Rating',
      icon: <FaStar className="w-4 h-4" />,
      width: '150px',
      accessor: (item: ProductViewItem) => {
        const { displayName, imagePath } = getRatingDisplayInfo(item.region_name, item.rating_name);

        return (
          <div className="flex items-center space-x-2">
            {imagePath && (
              <img 
                src={imagePath} 
                alt={displayName} 
                className="h-8 w-auto"
                title={displayName}
              />
            )}
            <span className="text-sm text-gray-300">{item.rating_name || ''}</span>
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
            onRowClick={(item) => {
              setSelectedProduct(item);
            }}
          />
        </Card.Body>
      </Card>

      <ProductModal
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
      />
    </Page>
  );
}

export default Home;
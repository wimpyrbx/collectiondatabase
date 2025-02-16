// src/pages/Home.tsx
import React from 'react';
import Page from '@/components/page/Page';
import { useProductsCache } from '@/hooks/viewHooks';
import { ProductViewItem } from '@/types/product';
import { FaListAlt, FaTag, FaDollarSign, FaLayerGroup, FaGlobe, FaCalendar, FaPlus, FaImage, FaStar, FaCalendarAlt } from 'react-icons/fa';
import { BaseFilterableTable } from '@/components/table/BaseFilterableTable';
import { type Column } from '@/components/table/Table';
import { useTableState } from '@/components/table/hooks/useTableState';
import { Card } from '@/components/card';
import { ProductModal } from '@/components/modal/ProductModal';
import regionsData from '@/data/regions.json';
import { ImageDisplay } from '@/components/image/ImageDisplay';
import { Button } from '@/components/ui';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { updateInventoryCache } from '@/utils/inventoryUtils';

interface InventoryItem {
  id: number;
  product_id: number;
  inventory_status: string;
  created_at: string;
  inventory_updated_at: string;
  purchase_id?: number;
  sale_id?: number;
  override_price?: number;
}

const Home = () => {
  const { data, isLoading, isError, error } = useProductsCache();
  const [selectedProduct, setSelectedProduct] = React.useState<ProductViewItem | null>(null);
  const [updatedProductId, setUpdatedProductId] = React.useState<number | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const handleAddToInventory = async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateInventoryCache(productId, queryClient);
  };

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
      width: '100px',
      accessor: (item: ProductViewItem) => item.product_variant || '',
      align: 'left' as const,
      sortable: true,
      sortKey: 'product_variant'
    },
    {
      key: 'release_year',
      header: '',
      icon: <FaCalendarAlt className="w-4 h-4" />,
      width: '50px',
      accessor: (item: ProductViewItem) => item.release_year || '',
      align: 'center' as const
    },
    {
      key: 'region_name',
      header: '',
      icon: <FaGlobe className="w-4 h-4" />,
      width: '20px',
      accessor: (item: ProductViewItem) => {
        const region = regionsData.regions.find(r => r.name === item.region_name);
        return (
            <span>{item.region_name || ''}</span>
        );
      },
      align: 'center' as const
    },
    {
      key: 'rating_name',
      header: '',
      icon: <FaStar className="w-4 h-4 text-yellow-400" />,
      width: '20px',
      accessor: (item: ProductViewItem) => {
        if (!item.rating_name || !item.region_name) return '';
        const ratingInfo = getRatingDisplayInfo(item.region_name, item.rating_name, regionsData.regions);
        return (
          <div className="flex items-center gap-2">
            {ratingInfo?.imagePath && (
              <img 
                src={ratingInfo.imagePath} 
                alt={item.rating_name}
                className="h-5 w-auto object-contain"
              />
            )}
          </div>
        );
      },
      align: 'center' as const
    },
    {
      key: 'price_usd',
      header: 'CIB',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '70px',
      accessor: (item: ProductViewItem) => item.price_usd ? `$${item.price_usd.toFixed(2)}` : '',
      align: 'center' as const
    },
    {
      key: 'price_new_usd',
      header: 'New',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '70px',
      accessor: (item: ProductViewItem) => item.price_new_usd ? `$${item.price_new_usd.toFixed(2)}` : '',
      align: 'center' as const
    },
    {
      key: 'final_price',
      header: 'Price',
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      width: '80px',
      accessor: (item: ProductViewItem) => item.final_price ? `NOK ${item.final_price.toFixed(0)},-` : '',
      sortKey: 'final_price',
      align: 'center' as const
    },
    {
      key: 'pricecharting',
      header: '',
      icon: <FaGlobe className="w-4 h-4 text-blue-400" />,
      width: '40px',
      accessor: (item: ProductViewItem) => item.pricecharting_id ? (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.pricecharting.com/game/${item.pricecharting_id}`, '_blank');
          }}
          bgColor="bg-yellow-900/50"
          className="w-6 h-6 !p-0 hover:bg-yellow-800 transition-colors"
          hoverEffect='scale'
          title="Open in PriceCharting"
        >
          <FaGlobe className="w-3 h-3" />
        </Button>
      ) : '',
      align: 'center' as const
    },
    {
      key: 'add_to_inventory',
      header: '',
      icon: <FaPlus className="w-4 h-4 text-green-400" />,
      width: '40px',
      accessor: (item: ProductViewItem) => (
        <Button
          onClick={(e) => handleAddToInventory(item.product_id, e)}
          bgColor="bg-green-900/50"
          className="w-6 h-6 !p-0 hover:bg-green-800 transition-colors"
          hoverEffect='scale'
          title="Add to inventory"
        >
          <FaPlus className="w-3 h-3" />
        </Button>
      ),
      align: 'center' as const
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
        options: uniqueVariants.map(variant => ({
          value: variant,
          label: variant,
          count: data.filter(item => item.product_variant === variant).length
        }))
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
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedProduct(null);
    setIsCreating(false);
    setIsModalOpen(false);
  };

  const handleSuccess = (productId: number) => {
    setSelectedProduct(null);
    setIsCreating(false);
    setUpdatedProductId(productId);
    setTimeout(() => {
      setUpdatedProductId(null);
    }, 1500);
    setIsModalOpen(false);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsCreating(true);
    setIsModalOpen(true);
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
            data={tableState.filteredAndSortedData}
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
            isModalOpen={isModalOpen}
            fixedHeight="h-[36px]"
            navigationLocation="top"
            updateAgeColumn="products_updated_at"
            rowClassName={(item: ProductViewItem) => 
              selectedProduct?.product_id === item.product_id && isModalOpen 
                ? '!bg-cyan-500/20 transition-colors duration-200' 
                : ''
            }
          />
        </Card.Body>
      </Card>

      <ProductModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        mode={isCreating ? 'create' : 'edit'}
        tableData={tableState.filteredAndSortedData}
        onNavigate={(productId) => {
          const product = data?.find(p => p.product_id === productId);
          if (product) {
            setSelectedProduct(product);
          }
        }}
        currentPage={tableState.pagination.currentPage}
        onPageChange={tableState.pagination.onPageChange}
        pageSize={tableState.pagination.pageSize}
      />
    </Page>
  );
}

export default Home;
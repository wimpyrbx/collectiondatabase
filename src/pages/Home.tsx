// src/pages/Home.tsx
import React, { useState, useMemo } from 'react';
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
import { TagDisplay } from '@/components/tag/TagDisplay';
import { useQuery } from '@tanstack/react-query';

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

  const handleAddToInventory = React.useCallback(async (productId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateInventoryCache(productId, queryClient);
  }, [queryClient]);

  const columns = React.useMemo<Column<ProductViewItem>[]>(() => [
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
      accessor: (item: ProductViewItem) => item.product_id ? (
        <ImageDisplay 
          type="product" 
          id={item.product_id} 
          title={item.product_title} 
          className="object-contain p-0 h-[20px]" 
        />
      ) : '',
      align: 'center' as const
    },
    {
      key: 'product_title',
      header: 'Product Title',
      icon: <FaTag className="w-4 h-4" />,
      accessor: (item: ProductViewItem) => (
        <div className="flex justify-between items-center gap-2">
          <span>{item.product_title || ''}</span>
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-2 items-center">
              {[...item.tags]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(tag => (
                  <TagDisplay 
                  key={tag.id} 
                  tag={tag}
                  className="whitespace-nowrap"
                  />
                ))}
            </div>
          )}
        </div>
      ),
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
      key: 'CIB',
      header: 'CIB',
      width: '80px',
      align: 'center' as const,
      icon: <FaDollarSign className="w-4 h-4 text-green-500" />,
      sortable: true,
      accessor: (item: ProductViewItem) => item.prices?.complete?.usd ? `$${item.prices.complete.usd.toFixed(2)}` : '',
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
  ], [handleAddToInventory]);

  const getFilterConfigs = React.useCallback((data: ProductViewItem[]) => {
    // Create Maps for faster lookups
    const typeMap = new Map<string, number>();
    const groupMap = new Map<string, number>();
    const variantMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    // Single pass through data to count all values
    data.forEach(item => {
      if (item.product_type_name) {
        typeMap.set(item.product_type_name, (typeMap.get(item.product_type_name) || 0) + 1);
      }
      if (item.product_group_name) {
        groupMap.set(item.product_group_name, (groupMap.get(item.product_group_name) || 0) + 1);
      }
      if (item.product_variant) {
        variantMap.set(item.product_variant, (variantMap.get(item.product_variant) || 0) + 1);
      }
      // Count tags
      item.tags?.forEach(tag => {
        tagMap.set(tag.name, (tagMap.get(tag.name) || 0) + 1);
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
        key: 'product_variant',
        label: 'Variant',
        options: Array.from(variantMap.entries()).map(([value, count]) => ({
          value,
          label: value,
          count
        }))
      },
      {
        key: 'tag_product',
        label: 'Tags',
        options: Array.from(tagMap.entries()).map(([value, count]) => ({
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

  const filteredData = React.useMemo(() => {
    if (!data) return [];
    
    return data.filter(item => {
      // Apply filters
      const filtersPassed = Object.entries(tableState.selectedFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true;
        
        if (key === 'tag_product') {
          // For tags, check if the item has any of the selected tags
          return values.some(value => 
            item.tags?.some(tag => tag.name === value)
          );
        }
        
        // For other filters, use the existing logic
        const itemValue = item[key as keyof ProductViewItem];
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
            data={filteredData}
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
        tableData={filteredData}
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
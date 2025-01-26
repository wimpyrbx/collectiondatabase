import React from 'react';
import Page from '@/components/page/Page';
import { Card } from '@/components/card';
import { FaTags } from 'react-icons/fa';
import { TagDisplayOrderManager } from '@/components/tag/TagDisplayOrderManager';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useInventoryTagsCache } from '@/hooks/useInventoryTagsCache';
import { useProductTagsTable } from '@/hooks/useProductTagsTable';
import { useInventoryTagsTable } from '@/hooks/useInventoryTagsTable';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import type { BaseTag } from '@/types/tags';

const TagDisplaySettings = () => {
  // Load product metadata
  const { productTypeNames, productGroupNames } = useProductMetadata();

  // Product tags
  const { data: productTags = [], isLoading: isLoadingProductTags } = useProductTagsCache();
  const { 
    updateDisplayOrder: updateProductTagOrderMutation, 
    updateTag: updateProductTagMutation,
    isUpdatingOrder: isUpdatingProductOrder,
    isUpdating: isUpdatingProduct 
  } = useProductTagsTable();

  // Inventory tags
  const { data: inventoryTags = [], isLoading: isLoadingInventoryTags } = useInventoryTagsCache();
  const { 
    updateDisplayOrder: updateInventoryTagOrderMutation, 
    updateTag: updateInventoryTagMutation,
    isUpdatingOrder: isUpdatingInventoryOrder,
    isUpdating: isUpdatingInventory 
  } = useInventoryTagsTable();

  // Wrap mutations to match expected function signature
  const handleUpdateProductTagOrder = (id: number, order: number | null) => {
    updateProductTagOrderMutation({ id, order });
  };

  const handleUpdateInventoryTagOrder = (id: number, order: number | null) => {
    updateInventoryTagOrderMutation({ id, order });
  };

  const handleUpdateProductTag = (id: number, updates: Partial<BaseTag>) => {
    updateProductTagMutation({ id, updates });
  };

  const handleUpdateInventoryTag = (id: number, updates: Partial<BaseTag>) => {
    updateInventoryTagMutation({ id, updates });
  };

  return (
    <Page
      title="Tag Display Settings"
      icon={<FaTags />}
      iconColor="text-cyan-500"
      bgColor="bg-gray-800"
      subtitle="Manage which tags appear in tables and their display order"
    >
      <div className="grid grid-cols-2 gap-6">
        {/* Product Tags */}
        <Card>
          <Card.Header
            title="Product Tags"
            icon={<FaTags />}
            iconColor="text-orange-500"
            bgColor="bg-orange-500/20"
          />
          <Card.Body>
            {isLoadingProductTags ? (
              <div className="text-gray-400">Loading product tags...</div>
            ) : (
              <TagDisplayOrderManager
                tags={productTags}
                onUpdateDisplayOrder={handleUpdateProductTagOrder}
                onUpdateTag={handleUpdateProductTag}
                isUpdating={isUpdatingProductOrder || isUpdatingProduct}
                productTypes={productTypeNames}
                productGroups={productGroupNames}
              />
            )}
          </Card.Body>
        </Card>

        {/* Inventory Tags */}
        <Card>
          <Card.Header
            title="Inventory Tags"
            icon={<FaTags />}
            iconColor="text-cyan-500"
            bgColor="bg-cyan-500/20"
          />
          <Card.Body>
            {isLoadingInventoryTags ? (
              <div className="text-gray-400">Loading inventory tags...</div>
            ) : (
              <TagDisplayOrderManager
                tags={inventoryTags}
                onUpdateDisplayOrder={handleUpdateInventoryTagOrder}
                onUpdateTag={handleUpdateInventoryTag}
                isUpdating={isUpdatingInventoryOrder || isUpdatingInventory}
                productTypes={productTypeNames}
                productGroups={productGroupNames}
              />
            )}
          </Card.Body>
        </Card>
      </div>
    </Page>
  );
};

export default TagDisplaySettings; 
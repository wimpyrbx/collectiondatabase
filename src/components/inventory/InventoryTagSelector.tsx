import React, { forwardRef } from 'react';
import { useInventoryTagsCache } from '@/hooks/useInventoryTagsCache';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useInventoryTagsRelationship } from '@/hooks/useInventoryTagsRelationship';
import { Switch } from '@/components/ui';
import { FaTags } from 'react-icons/fa';
import { useQueryClient } from '@tanstack/react-query';
import { TAGS_QUERY_KEY } from '@/hooks/useTagsCache';
import type { TagsRelationshipView } from '@/types/tags';

interface InventoryTagSelectorProps {
  inventoryId: number;
  productId: number;
  className?: string;
  onSave?: () => void;
}

export interface InventoryTagSelectorRef {
  applyChanges: () => void;
  hasChanges: () => boolean;
}

export const InventoryTagSelector = forwardRef<InventoryTagSelectorRef, InventoryTagSelectorProps>(({
  inventoryId,
  productId,
  className = '',
  onSave
}, ref) => {
  const queryClient = useQueryClient();
  const { data: availableInventoryTags = [], isLoading: isInventoryTagsLoading } = useInventoryTagsCache();
  const { data: availableProductTags = [], isLoading: isProductTagsLoading } = useProductTagsCache();
  const { data: tagsData } = useTagsCache();
  const { createRelationship: createInventoryTagRelationship, deleteRelationship: deleteInventoryTagRelationship } = useInventoryTagsRelationship();
  
  // Get initial tags directly from the cache data
  const initialTags = React.useMemo(() => {
    if (!tagsData?.combined_data) return { inventoryTags: [], productTags: [] };
    return {
      inventoryTags: tagsData.combined_data.inventory[inventoryId.toString()] || [],
      productTags: tagsData.combined_data.products[productId.toString()] || []
    };
  }, [tagsData, inventoryId, productId]);

  const [selectedInventoryTags, setSelectedInventoryTags] = React.useState<string[]>(initialTags.inventoryTags);
  const [selectedProductTags, setSelectedProductTags] = React.useState<string[]>(initialTags.productTags);

  // Reset selected tags when inventory/product changes or initial tags change
  React.useEffect(() => {
    setSelectedInventoryTags(initialTags.inventoryTags);
    setSelectedProductTags(initialTags.productTags);
  }, [initialTags]);

  const handleInventoryTagToggle = (tagName: string, checked: boolean) => {
    setSelectedInventoryTags(prev => 
      checked 
        ? [...prev, tagName]
        : prev.filter(t => t !== tagName)
    );
  };

  // Function to apply changes to the cache and database
  const applyChanges = React.useCallback(async () => {
    const oldData = queryClient.getQueryData<TagsRelationshipView>(TAGS_QUERY_KEY);
    if (!oldData) return;

    // Calculate inventory tag differences
    const inventoryTagsToAdd = selectedInventoryTags.filter(tag => !initialTags.inventoryTags.includes(tag));
    const inventoryTagsToRemove = initialTags.inventoryTags.filter(tag => !selectedInventoryTags.includes(tag));

    // Update database
    try {
      // Add new inventory tag relationships
      for (const tagName of inventoryTagsToAdd) {
        const tagToAdd = availableInventoryTags.find(t => t.tag_name === tagName);
        if (tagToAdd) {
          await createInventoryTagRelationship({
            inventoryId,
            tagId: tagToAdd.id
          });
        }
      }

      // Remove inventory tag relationships
      for (const tagName of inventoryTagsToRemove) {
        const tagToRemove = availableInventoryTags.find(t => t.tag_name === tagName);
        if (tagToRemove) {
          await deleteInventoryTagRelationship({
            inventoryId,
            tagId: tagToRemove.id
          });
        }
      }

      // Update cache after successful database updates
      const newData: TagsRelationshipView = {
        combined_data: {
          ...oldData.combined_data,
          inventory: {
            ...oldData.combined_data.inventory,
            [inventoryId.toString()]: selectedInventoryTags
          },
          products: {
            ...oldData.combined_data.products,
            [productId.toString()]: selectedProductTags
          }
        }
      };

      queryClient.setQueryData(TAGS_QUERY_KEY, newData);
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Revert selected tags to initial state on error
      setSelectedInventoryTags(initialTags.inventoryTags);
      setSelectedProductTags(initialTags.productTags);
    }
  }, [
    queryClient,
    selectedInventoryTags,
    selectedProductTags,
    initialTags,
    inventoryId,
    productId,
    availableInventoryTags,
    createInventoryTagRelationship,
    deleteInventoryTagRelationship,
    onSave
  ]);

  // Check if there are any pending changes
  const hasChanges = React.useCallback(() => {
    const currentInventoryTags = new Set(selectedInventoryTags);
    const initialInventoryTags = new Set(initialTags.inventoryTags);

    // Check if any tags were added or removed
    return selectedInventoryTags.length !== initialTags.inventoryTags.length ||
      selectedInventoryTags.some(tag => !initialInventoryTags.has(tag)) ||
      initialTags.inventoryTags.some(tag => !currentInventoryTags.has(tag));
  }, [selectedInventoryTags, initialTags.inventoryTags]);

  // Expose methods to parent
  React.useImperativeHandle(
    ref,
    () => ({
      applyChanges,
      hasChanges
    }),
    [applyChanges, hasChanges]
  );

  if (isInventoryTagsLoading || isProductTagsLoading) {
    return <div className="text-gray-500">Loading tags...</div>;
  }

  return (
    <div className={className}>
      {/* Inventory Tags */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
          <FaTags className="text-cyan-500" />
          <span>Inventory Tags</span>
        </label>
        <div className="grid grid-cols-1 gap-4">
          {availableInventoryTags.map(tag => (
            <Switch
              key={tag.id}
              checked={selectedInventoryTags.includes(tag.tag_name || '')}
              onChange={(checked) => handleInventoryTagToggle(tag.tag_name || '', checked)}
              size="sm"
              shape="boxed"
              label={
                <div className="flex flex-col">
                  <span className="text-sm text-gray-200">{tag.tag_name}</span>
                  {tag.tag_description && (
                    <span className="text-xs text-gray-400">{tag.tag_description}</span>
                  )}
                </div>
              }
            />
          ))}
        </div>
      </div>

      {/* Product Tags (Read-only) */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-orange-300 mb-2">
          <FaTags className="text-orange-400" />
          <span>Product Tags (Read-only)</span>
        </label>
        <div className="grid grid-cols-1 gap-4 cursor-default">
          {availableProductTags.map(tag => (
            <div
              key={tag.id}
              className={`p-2 rounded-lg border ${
                selectedProductTags.includes(tag.tag_name || '')
                  ? 'bg-orange-500/20 border-orange-500/30'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-200">{tag.tag_name}</span>
                {tag.tag_description && (
                  <span className="text-xs text-gray-400">{tag.tag_description}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

InventoryTagSelector.displayName = 'InventoryTagSelector';

export default InventoryTagSelector; 
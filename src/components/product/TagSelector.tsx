import React, { forwardRef } from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsRelationship } from '@/hooks/useProductTagsRelationship';
import { Switch } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { TAGS_QUERY_KEY } from '@/hooks/useTagsCache';
import type { TagsRelationshipView } from '@/types/tags';

interface TagSelectorProps {
  productId: number;
  className?: string;
  onSave?: () => void;
}

export interface TagSelectorRef {
  applyChanges: () => Promise<void>;
  hasChanges: () => boolean;
}

export const TagSelector = forwardRef<TagSelectorRef, TagSelectorProps>(({
  productId,
  className = '',
  onSave
}, ref) => {
  const queryClient = useQueryClient();
  const { data: availableTags = [], isLoading: isTagsLoading } = useProductTagsCache();
  const { data: tagsData } = useTagsCache();
  const { createRelationship, deleteRelationship } = useProductTagsRelationship();
  
  // Get initial tags directly from the cache data
  const initialTags = React.useMemo(() => {
    if (!tagsData?.combined_data.products) return [];
    return tagsData.combined_data.products[productId.toString()] || [];
  }, [tagsData, productId]);

  const [selectedTags, setSelectedTags] = React.useState<string[]>(initialTags);

  // Reset selected tags when product changes or initial tags change
  React.useEffect(() => {
    setSelectedTags(initialTags);
  }, [initialTags]);

  const handleTagToggle = (tagName: string, checked: boolean) => {
    setSelectedTags(prev => 
      checked 
        ? [...prev, tagName]
        : prev.filter(t => t !== tagName)
    );
  };

  // Function to apply changes to the cache and database
  const applyChanges = React.useCallback(async () => {
    // Get the current tags from the cache
    const currentTags = new Set(initialTags);
    const selectedSet = new Set(selectedTags);

    // Find tags to add and remove
    const tagsToAdd = selectedTags.filter(tag => !currentTags.has(tag));
    const tagsToRemove = initialTags.filter(tag => !selectedSet.has(tag));

    // Prepare optimistic updates
    const oldData = queryClient.getQueryData(['tags']);

    try {
      // Apply optimistic update
      queryClient.setQueryData(['tags'], (old: any) => {
        if (!old?.combined_data?.products) return old;

        const newData = {
          ...old,
          combined_data: {
            ...old.combined_data,
            products: {
              ...old.combined_data.products,
              [productId.toString()]: selectedTags
            }
          }
        };
        return newData;
      });

      // Create new relationships
      for (const tag of tagsToAdd) {
        const tagInfo = availableTags.find(t => t.tag_name === tag);
        if (tagInfo) {
          await createRelationship({
            productId: productId,
            tagId: tagInfo.id
          });
        }
      }

      // Remove old relationships
      for (const tag of tagsToRemove) {
        const tagInfo = availableTags.find(t => t.tag_name === tag);
        if (tagInfo) {
          await deleteRelationship({
            productId: productId,
            tagId: tagInfo.id
          });
        }
      }

      // Call onSave if provided
      onSave?.();
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(['tags'], oldData);
      throw error;
    }
  }, [queryClient, productId, selectedTags, initialTags, availableTags, createRelationship, deleteRelationship, onSave]);

  // Function to check if there are unsaved changes
  const hasChanges = React.useCallback(() => {
    const initialSet = new Set(initialTags);
    const selectedSet = new Set(selectedTags);
    
    // Check if any tags were added or removed
    return initialTags.length !== selectedTags.length ||
      selectedTags.some(tag => !initialSet.has(tag)) ||
      initialTags.some(tag => !selectedSet.has(tag));
  }, [initialTags, selectedTags]);

  // Expose applyChanges to parent
  React.useImperativeHandle(
    ref,
    () => ({
      applyChanges,
      hasChanges
    }),
    [applyChanges, hasChanges]
  );

  if (isTagsLoading) {
    return <div className="text-gray-500">Loading tags...</div>;
  }

  return (
    <div className={`${className}`}>
      <div className="flex flex-col gap-2">
        {availableTags.map(tag => (
          <Switch
            key={tag.id}
            checked={selectedTags.includes(tag.tag_name || '')}
            onChange={(checked) => handleTagToggle(tag.tag_name || '', checked)}
            size="xs"
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
  );
});

export default TagSelector; 
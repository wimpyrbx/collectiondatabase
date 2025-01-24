import React, { forwardRef } from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsRelationship } from '@/hooks/useProductTagsRelationship';
import { Switch } from '@/components/ui';
import { FaTags } from 'react-icons/fa';
import { useQueryClient } from '@tanstack/react-query';
import { TAGS_QUERY_KEY } from '@/hooks/useTagsCache';
import type { TagsRelationshipView } from '@/types/tags';

interface TagSelectorProps {
  productId: number;
  className?: string;
  onSave?: () => void;
}

export interface TagSelectorRef {
  applyChanges: () => void;
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
    const oldData = queryClient.getQueryData<TagsRelationshipView>(TAGS_QUERY_KEY);
    if (!oldData) return;

    // Calculate tag differences
    const tagsToAdd = selectedTags.filter(tag => !initialTags.includes(tag));
    const tagsToRemove = initialTags.filter(tag => !selectedTags.includes(tag));

    // Update database
    try {
      // Add new tag relationships
      for (const tagName of tagsToAdd) {
        const tagToAdd = availableTags.find(t => t.tag_name === tagName);
        if (tagToAdd) {
          await createRelationship({
            productId,
            tagId: tagToAdd.id
          });
        }
      }

      // Remove tag relationships
      for (const tagName of tagsToRemove) {
        const tagToRemove = availableTags.find(t => t.tag_name === tagName);
        if (tagToRemove) {
          await deleteRelationship({
            productId,
            tagId: tagToRemove.id
          });
        }
      }

      // Update cache after successful database updates
      const newData: TagsRelationshipView = {
        combined_data: {
          ...oldData.combined_data,
          products: {
            ...oldData.combined_data.products,
            [productId.toString()]: selectedTags
          }
        }
      };

      queryClient.setQueryData(TAGS_QUERY_KEY, newData);
      if (onSave) onSave();
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Revert selected tags to initial state on error
      setSelectedTags(initialTags);
    }
  }, [queryClient, productId, selectedTags, initialTags, availableTags, createRelationship, deleteRelationship, onSave]);

  // Expose applyChanges to parent
  React.useImperativeHandle(
    ref,
    () => ({
      applyChanges
    }),
    [applyChanges]
  );

  if (isTagsLoading) {
    return <div className="text-gray-500">Loading tags...</div>;
  }

  return (
    <div className={className}>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
        <FaTags className="text-blue-400" />
        <span>Tags</span>
      </label>
      <div className="flex flex-col gap-4">
        {availableTags.map(tag => (
          <Switch
            key={tag.id}
            checked={selectedTags.includes(tag.tag_name || '')}
            onChange={(checked) => handleTagToggle(tag.tag_name || '', checked)}
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
  );
});

export default TagSelector; 
import React, { forwardRef } from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsRelationship } from '@/hooks/useProductTagsRelationship';
import { Switch } from '@/components/ui';

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
  const { data: availableTags = [], isLoading: isTagsLoading } = useProductTagsCache();
  const { getProductTags } = useTagsCache();
  const { updateAllRelationships } = useProductTagsRelationship();
  
  // Get initial tags directly from the cache
  const initialTags = React.useMemo(() => 
    getProductTags(productId) ?? [], 
    [getProductTags, productId]
  );

  // Initialize selected tags state with initial tags
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // Only update selected tags when productId changes or when initialTags are first loaded
  React.useEffect(() => {
    setSelectedTags(initialTags);
  }, [productId]);

  const handleTagToggle = (tagName: string, checked: boolean) => {
    setSelectedTags(prev => 
      checked 
        ? [...prev, tagName]
        : prev.filter(t => t !== tagName)
    );
  };

  // Function to apply changes to the database
  const applyChanges = React.useCallback(async () => {
    try {
      // Get tag IDs for selected tags
      const tagIds = selectedTags
        .map(tag => availableTags.find(t => t.tag_name === tag)?.id)
        .filter((id): id is number => id !== undefined);

      // Update all relationships in a single operation
      await updateAllRelationships({
        productId,
        tagIds
      });

      onSave?.();
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Reset to initial state on error
      setSelectedTags(initialTags);
      throw error;
    }
  }, [productId, selectedTags, availableTags, updateAllRelationships, onSave, initialTags]);

  // Check if there are any pending changes
  const hasChanges = React.useCallback(() => {
    const initialSet = new Set(initialTags);
    const selectedSet = new Set(selectedTags);
    
    return initialTags.length !== selectedTags.length ||
      selectedTags.some(tag => !initialSet.has(tag)) ||
      initialTags.some(tag => !selectedSet.has(tag));
  }, [initialTags, selectedTags]);

  // Expose methods to parent
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

TagSelector.displayName = 'TagSelector'; 
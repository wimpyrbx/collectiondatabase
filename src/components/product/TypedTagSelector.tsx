import React, { forwardRef } from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsRelationship } from '@/hooks/useProductTagsRelationship';
import { Switch } from '@/components/ui';
import { FormElement } from '@/components/formelement';
import { BaseTag } from '@/types/tags';

interface TypedTagSelectorProps {
  productId: number;
  className?: string;
  onSave?: () => void;
}

export interface TypedTagSelectorRef {
  applyChanges: () => Promise<void>;
  hasChanges: () => boolean;
}

export const TypedTagSelector = forwardRef<TypedTagSelectorRef, TypedTagSelectorProps>(({
  productId,
  className = '',
  onSave
}, ref) => {
  const { data: availableTags = [], isLoading: isTagsLoading } = useProductTagsCache();
  const { data: relationshipData } = useTagsCache();
  const { updateAllRelationships } = useProductTagsRelationship();
  
  // Get initial tags and values directly from the cache
  const initialTags = React.useMemo(() => {
    if (!relationshipData?.combined_data.products) return [];
    const tags = relationshipData.combined_data.products[productId.toString()] || [];
    return tags.map(tagString => {
      const [name] = tagString.split('=');
      return name;
    });
  }, [productId, relationshipData]);

  // Initialize states with initial values
  const [selectedTags, setSelectedTags] = React.useState<string[]>(initialTags);
  const [tagValues, setTagValues] = React.useState<Record<number, string>>(() => {
    if (!relationshipData?.combined_data.products) return {};
    const tags = relationshipData.combined_data.products[productId.toString()] || [];
    const initialValues: Record<number, string> = {};
    
    tags.forEach(tagString => {
      const [name, value] = tagString.split('=');
      if (value) {
        const tag = availableTags.find(t => t.tag_name === name);
        if (tag) {
          initialValues[tag.id] = value;
        }
      }
    });
    
    return initialValues;
  });

  // Reset state when productId changes (modal reopens)
  React.useEffect(() => {
    if (!relationshipData?.combined_data.products) return;
    const tags = relationshipData.combined_data.products[productId.toString()] || [];
    
    // Update selected tags
    const newSelectedTags = tags.map(tagString => {
      const [name] = tagString.split('=');
      return name;
    });
    setSelectedTags(newSelectedTags);
    
    // Update tag values
    const newValues: Record<number, string> = {};
    tags.forEach(tagString => {
      const [name, value] = tagString.split('=');
      if (value) {
        const tag = availableTags.find(t => t.tag_name === name);
        if (tag) {
          newValues[tag.id] = value;
        }
      }
    });
    setTagValues(newValues);
  }, [productId, relationshipData, availableTags]);

  const handleTagToggle = (tag: BaseTag, checked: boolean) => {
    setSelectedTags(prev => {
      if (checked) {
        return [...prev, tag.tag_name || ''];
      } else {
        // When unchecking, also remove any stored value
        const newTagValues = { ...tagValues };
        delete newTagValues[tag.id];
        setTagValues(newTagValues);
        return prev.filter(t => t !== tag.tag_name);
      }
    });
  };

  const handleTagValueChange = (tagId: number, value: string) => {
    setTagValues(prev => ({
      ...prev,
      [tagId]: value
    }));
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
        tagIds,
        tagValues
      });

      onSave?.();
    } catch (error) {
      console.error('Failed to update tags:', error);
      // Reset to initial state on error
      setSelectedTags(initialTags);
      throw error;
    }
  }, [productId, selectedTags, tagValues, availableTags, updateAllRelationships, onSave, initialTags]);

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

  // Group tags by type
  const groupedTags = availableTags.reduce<Record<string, BaseTag[]>>((acc, tag) => {
    if (!tag.tag_type) return acc;
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {});

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toggle Tags (Boolean) */}
      {groupedTags.boolean && groupedTags.boolean.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Toggle Tags</h3>
          <div className="space-y-2">
            {groupedTags.boolean.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50 border border-gray-700"
              >
                <div>
                  <div className="text-sm text-gray-300">{tag.tag_name}</div>
                  {tag.tag_description && (
                    <div className="text-xs text-gray-500">{tag.tag_description}</div>
                  )}
                </div>
                <Switch
                  checked={selectedTags.includes(tag.tag_name || '')}
                  onChange={checked => handleTagToggle(tag, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selection Tags (Set) */}
      {groupedTags.set && groupedTags.set.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Selection Tags</h3>
          <div className="space-y-2">
            {groupedTags.set.map(tag => {
              const isSelected = selectedTags.includes(tag.tag_name || '');
              const value = tagValues[tag.id];
              return (
                <div
                  key={tag.id}
                  className={`p-2 rounded-lg border ${
                    isSelected && value ? 'bg-green-900/20 border-green-700' : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="text-sm text-gray-300">{tag.tag_name}</div>
                  {tag.tag_description && (
                    <div className="text-xs text-gray-500">{tag.tag_description}</div>
                  )}
                  <FormElement
                    elementType="listsingle"
                    options={[
                      { value: '', label: '-' },
                      ...(tag.tag_values?.map(value => ({ value, label: value })) || [])
                    ]}
                    selectedOptions={value || ''}
                    onValueChange={newValue => {
                      if (newValue) {
                        handleTagToggle(tag, true);
                        handleTagValueChange(tag.id, String(newValue));
                      } else {
                        handleTagToggle(tag, false);
                      }
                    }}
                    className="mt-2"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Text Tags */}
      {groupedTags.text && groupedTags.text.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Text Tags</h3>
          <div className="space-y-2">
            {groupedTags.text.map(tag => {
              const isSelected = selectedTags.includes(tag.tag_name || '');
              const value = tagValues[tag.id];
              return (
                <div
                  key={tag.id}
                  className={`p-2 rounded-lg border ${
                    isSelected && value ? 'bg-green-900/20 border-green-700' : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  <div className="text-sm text-gray-300">{tag.tag_name}</div>
                  {tag.tag_description && (
                    <div className="text-xs text-gray-500">{tag.tag_description}</div>
                  )}
                  <FormElement
                    elementType="input"
                    initialValue={value || ''}
                    onValueChange={newValue => {
                      if (newValue) {
                        handleTagToggle(tag, true);
                        handleTagValueChange(tag.id, String(newValue));
                      } else {
                        handleTagToggle(tag, false);
                      }
                    }}
                    className="mt-2"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

TypedTagSelector.displayName = 'TypedTagSelector'; 
import React, { forwardRef } from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsRelationship } from '@/hooks/useProductTagsRelationship';
import { Switch } from '@/components/ui';
import { FormElement } from '@/components/formelement';
import { BaseTag } from '@/types/tags';
import { useProductsCache } from '@/hooks/useProductsCache';
import { FaQuestionCircle, FaTags } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';

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
  const { data: products } = useProductsCache();
  
  // Get product type and group
  const product = React.useMemo(() => {
    return products?.find(p => p.product_id === productId);
  }, [products, productId]);

  // Filter tags based on product type and group
  const filteredTags = React.useMemo(() => {
    if (!availableTags || !product) return [];
    
    return availableTags.filter(tag => {
      // If tag has no type/group restrictions, allow it
      if (!tag.tag_product_types?.length && !tag.tag_product_groups?.length) {
        return true;
      }
      
      // Check product type match
      const typeMatches = !tag.tag_product_types?.length || 
        (product.product_type_name && tag.tag_product_types.includes(product.product_type_name));
      
      // Check product group match
      const groupMatches = !tag.tag_product_groups?.length || 
        (product.product_group_name && tag.tag_product_groups.includes(product.product_group_name));
      
      return typeMatches && groupMatches;
    });
  }, [availableTags, product]);
  
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
      // Get tag IDs and prepare tag values for selected tags
      const tagIds: number[] = [];
      const updatedTagValues: Record<number, string> = {};

      selectedTags.forEach(tagName => {
        const tag = availableTags.find(t => t.tag_name === tagName);
        if (tag) {
          tagIds.push(tag.id);
          // For boolean tags, set value to 'true'
          if (tag.tag_type === 'boolean') {
            updatedTagValues[tag.id] = 'true';
          } else if (tagValues[tag.id]) {
            updatedTagValues[tag.id] = tagValues[tag.id];
          }
        }
      });

      // Update all relationships in a single operation
      await updateAllRelationships({
        productId,
        tagIds,
        tagValues: updatedTagValues
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
  const groupedTags = filteredTags.reduce<Record<string, BaseTag[]>>((acc, tag) => {
    if (!tag.tag_type) return acc;
    if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
    acc[tag.tag_type].push(tag);
    return acc;
  }, {});

  return (
    <div className={`${className}`}>
      {/* Toggle Tags (Boolean) */}
      {groupedTags.boolean && groupedTags.boolean.length > 0 && (
        <div className="pt-3 grid grid-cols-3 gap-2">
          {groupedTags.boolean.map(tag => {
            const Icon = tag.tag_icon ? FaIcons[tag.tag_icon as keyof typeof FaIcons] : FaQuestionCircle; 
            const IconColor = tag.tag_icon_color ? `text-${tag.tag_icon_color}-500` : 'text-gray-500';
            return (
              <div key={tag.id} className="col-span-3">
                <Switch
                  checked={selectedTags.includes(tag.tag_name || '')}
                  onChange={checked => handleTagToggle(tag, checked)}
                  shape="boxed"
                  size="xs"
                  labelIcon={<Icon />}
                  labelIconColor={IconColor}
                  label={
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-300">{tag.tag_name}</span>
                      {tag.tag_description && (
                        <span className="text-xs text-gray-500">{tag.tag_description}</span>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Selection Tags (Set) */}
      {groupedTags.set && groupedTags.set.length > 0 && (
        <div className="pt-3 grid grid-cols-3 mb-3 gap-2">
          {groupedTags.set.map(tag => {
            const isSelected = selectedTags.includes(tag.tag_name || '');
            const value = tagValues[tag.id];
            return (
              <div
                key={tag.id}
                className={`p-2 rounded-lg border ${
                  isSelected && value ? 'bg-green-600/20 border-green-600' : 'bg-gray-600/20 border-gray-600'
                }`}
              >
                <FormElement
                  elementType="listsingle"
                  labelIcon={tag.tag_icon || <FaQuestionCircle />}
                  labelIconColor={tag.tag_icon_color ? `text-${tag.tag_icon_color}-500` : 'text-gray-500'}
                  labelPosition="above"
                  label={tag.tag_name || ''}
                  options={[
                    { value: '', label: '-' },
                    ...(tag.tag_values?.map(value => ({ value, label: value })) || [])
                  ]}
                  selectedOptions={value || ''}
                  onValueChange={newValue => {
                    const stringValue = newValue ? String(newValue) : '';
                    if (stringValue) {
                      handleTagToggle(tag, true);
                      handleTagValueChange(tag.id, stringValue);
                    } else {
                      handleTagToggle(tag, false);
                    }
                  }}
                  className=""
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Text Tags */}
      {groupedTags.text && groupedTags.text.length > 0 && (
        <div className="grid grid-cols-3 mb-3 gap-3">
          {groupedTags.text.map(tag => {
            const isSelected = selectedTags.includes(tag.tag_name || '');
            const value = tagValues[tag.id];
            const Icon = tag.tag_icon ? FaIcons[tag.tag_icon as keyof typeof FaIcons] : FaQuestionCircle; 
            const IconColor = tag.tag_icon_color ? `text-${tag.tag_icon_color}-500` : 'text-gray-500';
            return (
              <div
                key={tag.id}
                className={`p-1 rounded-lg border col-span-3 ${
                  isSelected && value ? 'bg-green-600/20 border-green-600' : 'bg-gray-600/20 border-gray-600'
                }`}
              >
                
                <FormElement
                  elementType="input"
                  textSize='xs'
                  labelIcon={<Icon />}
                  labelIconColor={IconColor}
                  label={tag.tag_name || ''}
                  initialValue={value || ''}
                  onValueChange={newValue => {
                    const stringValue = String(newValue);
                    const trimmedValue = stringValue.trim();
                    if (trimmedValue) {
                      handleTagToggle(tag, true);
                      handleTagValueChange(tag.id, trimmedValue);
                    } else {
                      handleTagToggle(tag, false);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

TypedTagSelector.displayName = 'TypedTagSelector'; 
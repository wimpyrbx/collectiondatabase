import React from 'react';
import { BaseTag, TagType } from '@/types/tags';
import { FormElement } from '@/components/formelement';
import { Button } from '@/components/ui';
import BaseStyledContainer from '@/components/ui/BaseStyledContainer';
import { FaArrowUp, FaArrowDown, FaTimes, FaEdit, FaSave, FaBan, FaLock } from 'react-icons/fa';

interface TagDisplayOrderManagerProps {
  tags: BaseTag[];
  onUpdateDisplayOrder: (id: number, order: number | null) => void;
  onUpdateTag: (id: number, updates: Partial<BaseTag>) => void;
  isUpdating: boolean;
  productTypes?: string[];
  productGroups?: string[];
}

interface TagEditFormProps {
  tag: BaseTag;
  onUpdate: (updates: Partial<BaseTag>) => void;
  isUpdating: boolean;
  productTypes?: string[];
  productGroups?: string[];
  onClose: () => void;
}

const TagEditForm: React.FC<TagEditFormProps> = ({
  tag,
  onUpdate,
  isUpdating,
  productTypes = [],
  productGroups = [],
  onClose
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [tagName, setTagName] = React.useState(tag.tag_name || '');
  const [tagDescription, setTagDescription] = React.useState(tag.tag_description || '');
  const [tagType, setTagType] = React.useState<TagType>(tag.tag_type);
  const [tagValues, setTagValues] = React.useState<string>(tag.tag_values?.join('\n') || '');
  const [selectedProductTypes, setSelectedProductTypes] = React.useState<string[]>(tag.tag_product_types || []);
  const [selectedProductGroups, setSelectedProductGroups] = React.useState<string[]>(tag.tag_product_groups || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const updates: Partial<BaseTag> = {
        tag_name: tagName,
        tag_description: tagDescription,
        tag_type: tagType,
        tag_values: tagType === 'set' ? tagValues.split('\n').filter(v => v.trim()) : null,
        tag_product_types: selectedProductTypes.length > 0 ? selectedProductTypes : null,
        tag_product_groups: selectedProductGroups.length > 0 ? selectedProductGroups : null
      };

      // Validate set type has values
      if (tagType === 'set' && (!updates.tag_values || updates.tag_values.length === 0)) {
        throw new Error('Set type tags must have at least one possible value');
      }

      await onUpdate(updates);
      onClose();
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating the tag');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
      {error && (
        <div className="p-2 rounded bg-red-900/50 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Tag Name */}
        <FormElement
          label="Tag Name"
          elementType="input"
          initialValue={tagName}
          onValueChange={(value) => setTagName(String(value))}
          disabled={isUpdating}
        />

        {/* Tag Description */}
        <FormElement
          label="Tag Description"
          elementType="input"
          initialValue={tagDescription}
          onValueChange={(value) => setTagDescription(String(value))}
          disabled={isUpdating}
        />

        {/* Type and Categories Row */}
        <div className="grid grid-cols-3 gap-4">
          <FormElement
            label="Tag Type"
            elementType="listsingle"
            selectedOptions={tagType}
            onValueChange={(value) => setTagType(value as TagType)}
            options={[
              { value: 'boolean', label: 'Boolean' },
              { value: 'set', label: 'Set' },
              { value: 'text', label: 'Text' }
            ]}
            disabled={isUpdating}
            labelPosition="above"
          />

          <FormElement
            label="Product Types"
            elementType="listmultiple"
            options={productTypes.map(type => ({ value: type, label: type }))}
            selectedOptions={selectedProductTypes}
            onValueChange={(values) => setSelectedProductTypes(values as string[])}
            disabled={isUpdating}
            labelPosition="above"
          />

          <FormElement
            label="Product Groups"
            elementType="listmultiple"
            options={productGroups.map(group => ({ value: group, label: group }))}
            selectedOptions={selectedProductGroups}
            onValueChange={(values) => setSelectedProductGroups(values as string[])}
            disabled={isUpdating}
            labelPosition="above"
          />
        </div>

        {/* Tag Values - Only show for set type */}
        {tagType === 'set' && (
          <FormElement
            label="Possible Values (one per line)"
            elementType="textarea"
            initialValue={tagValues}
            onValueChange={(value) => setTagValues(String(value))}
            disabled={isUpdating}
          />
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
        <BaseStyledContainer
          as="button"
          elementProps={{
            type: 'button',
            onClick: onClose,
            disabled: isUpdating
          }}
          bgColor="bg-red-900"
          size="xs"
          iconLeft={<FaBan />}
        >
          Cancel
        </BaseStyledContainer>
        <BaseStyledContainer
          as="button"
          elementProps={{
            type: 'submit',
            disabled: isUpdating
          }}
          bgColor="bg-green-700"
          size="xs"
          iconLeft={<FaSave />}
        >
          Save Changes
        </BaseStyledContainer>
      </div>
    </form>
  );
};

export const TagDisplayOrderManager: React.FC<TagDisplayOrderManagerProps> = ({
  tags,
  onUpdateDisplayOrder,
  onUpdateTag,
  isUpdating,
  productTypes = [],
  productGroups = []
}) => {
  const [editingTagId, setEditingTagId] = React.useState<number | null>(null);

  // Filter and sort tags
  const displayedTags = React.useMemo(() => 
    tags
      .filter(tag => tag.tags_display_in_table)
      .sort((a, b) => {
        if (!a.tags_display_in_table_order) return 1;
        if (!b.tags_display_in_table_order) return -1;
        return a.tags_display_in_table_order - b.tags_display_in_table_order;
      }),
    [tags]
  );

  const nonDisplayedTags = React.useMemo(() => 
    tags.filter(tag => !tag.tags_display_in_table),
    [tags]
  );

  // Handle moving tags up/down in order
  const handleMoveTag = (tag: BaseTag, direction: 'up' | 'down') => {
    if (!tag.tags_display_in_table_order) return;

    const currentIndex = displayedTags.findIndex(t => t.id === tag.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= displayedTags.length) return;

    const targetTag = displayedTags[newIndex];
    if (!targetTag.tags_display_in_table_order) return;

    // Swap orders
    onUpdateDisplayOrder(tag.id, targetTag.tags_display_in_table_order);
    onUpdateDisplayOrder(targetTag.id, tag.tags_display_in_table_order);
  };

  // Handle adding a tag to display
  const handleAddTag = (tagId: number) => {
    const maxOrder = Math.max(0, ...displayedTags.map(t => t.tags_display_in_table_order || 0));
    onUpdateDisplayOrder(tagId, maxOrder + 1);
  };

  // Handle removing a tag from display
  const handleRemoveTag = (tagId: number) => {
    onUpdateDisplayOrder(tagId, null);
  };

  return (
    <div className="space-y-6">
      {/* Currently displayed tags */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Displayed Tags</h3>
        <div className="space-y-2">
          {displayedTags.map(tag => (
            <React.Fragment key={tag.id}>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200">{tag.tag_name}</span>
                  <span className="text-xs text-gray-400">({tag.tag_type})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    onClick={() => setEditingTagId(tag.id)}
                    disabled={isUpdating}
                    iconLeft={<FaEdit />}
                  />
                  <Button
                    size="xs"
                    onClick={() => handleMoveTag(tag, 'up')}
                    disabled={isUpdating || displayedTags.indexOf(tag) === 0}
                    iconLeft={<FaArrowUp />}
                  />
                  <Button
                    size="xs"
                    onClick={() => handleMoveTag(tag, 'down')}
                    disabled={isUpdating || displayedTags.indexOf(tag) === displayedTags.length - 1}
                    iconLeft={<FaArrowDown />}
                  />
                  <Button
                    size="xs"
                    onClick={() => handleRemoveTag(tag.id)}
                    disabled={isUpdating}
                    iconLeft={<FaTimes />}
                    bgColor="bg-red-900"
                  />
                </div>
              </div>
              {editingTagId === tag.id && (
                <TagEditForm
                  tag={tag}
                  onUpdate={(updates) => onUpdateTag(tag.id, updates)}
                  isUpdating={isUpdating}
                  productTypes={productTypes}
                  productGroups={productGroups}
                  onClose={() => setEditingTagId(null)}
                />
              )}
            </React.Fragment>
          ))}
          {displayedTags.length === 0 && (
            <div className="text-sm text-gray-400 italic">No tags are currently displayed</div>
          )}
        </div>
      </div>

      {/* Available tags to add */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Available Tags</h3>
        <div className="space-y-2">
          {nonDisplayedTags.map(tag => (
            <React.Fragment key={tag.id}>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{tag.tag_name}</span>
                  <span className="text-xs text-gray-500">({tag.tag_type})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    onClick={() => setEditingTagId(tag.id)}
                    disabled={isUpdating}
                    iconLeft={<FaEdit />}
                  />
                  <Button
                    size="xs"
                    onClick={() => handleAddTag(tag.id)}
                    disabled={isUpdating}
                    iconLeft={<FaArrowUp />}
                  >
                    Add
                  </Button>
                </div>
              </div>
              {editingTagId === tag.id && (
                <TagEditForm
                  tag={tag}
                  onUpdate={(updates) => onUpdateTag(tag.id, updates)}
                  isUpdating={isUpdating}
                  productTypes={productTypes}
                  productGroups={productGroups}
                  onClose={() => setEditingTagId(null)}
                />
              )}
            </React.Fragment>
          ))}
          {nonDisplayedTags.length === 0 && (
            <div className="text-sm text-gray-400 italic">No tags available to add</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagDisplayOrderManager; 
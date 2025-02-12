import React, { useState } from 'react';
import Page from '@/components/page/Page';
import { Card } from '@/components/card';
import { FaTags, FaEdit } from 'react-icons/fa';
import Modal from '@/components/modal/Modal';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useInventoryTagsCache } from '@/hooks/useInventoryTagsCache';
import { useProductTagsTable } from '@/hooks/useProductTagsTable';
import { useInventoryTagsTable } from '@/hooks/useInventoryTagsTable';
import { useProductMetadata } from '@/hooks/useProductMetadata';
import type { BaseTag, TagType } from '@/types/tags';
import FormElement, { SelectionValue, TextValue } from '@/components/formelement/FormElement';
import { Button } from '@/components/ui';
import * as FaIcons from 'react-icons/fa';
import clsx from 'clsx';
import { Table } from '@/components/table/Table';
import type { Column as TableColumn } from '@/components/table/Table';
import type { ProductTag, InventoryTag } from '@/types/tags';

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
  const [tagName, setTagName] = React.useState<string>(tag.tag_name || '');
  const [tagIcon, setTagIcon] = React.useState<string>(tag.tag_icon || '');
  const [tagDescription, setTagDescription] = React.useState<string>(tag.tag_description || '');
  const [tagColor, setTagColor] = React.useState<string>(tag.tag_icon_color || '');
  const [tagType, setTagType] = React.useState<TagType>(tag.tag_type);
  const [tagDisplayAs, setTagDisplayAs] = React.useState<'only_value' | 'images' | null>(tag.tag_display_as);
  const [tagValues, setTagValues] = React.useState<string[]>(tag.tag_values || []);
  const [selectedProductTypes, setSelectedProductTypes] = React.useState<string[]>(tag.tag_product_types || []);
  const [selectedProductGroups, setSelectedProductGroups] = React.useState<string[]>(tag.tag_product_groups || []);
  const [error, setError] = React.useState<string | null>(null);
  const [tagInUse, setTagInUse] = React.useState(false);

  // Check if tag is in use before allowing type change
  React.useEffect(() => {
    if (tag.id) {
      fetch(`/api/check_tag_usage.php?id=${tag.id}`)
        .then(response => response.json())
        .then(data => setTagInUse(data.in_use))
        .catch(error => {
          console.error('Failed to check tag usage:', error);
          setTagInUse(true); // Assume in use if check fails
        });
    }
  }, [tag.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!tagName.trim()) {
      setError('Tag name is required');
      return;
    }

    // If changing tag type and tag is in use, prevent the change
    if (tagType !== tag.tag_type && tagInUse) {
      setError('Cannot change type of tag that is in use');
      return;
    }

    // Prepare updates
    const updates: Partial<BaseTag> = {
      tag_name: tagName,
      tag_icon: tagIcon || null,
      tag_description: tagDescription || null,
      tag_icon_color: tagColor || null,
      tag_type: tagType,
      tag_display_as: tagDisplayAs || null,
      tag_values: tagValues.length > 0 ? tagValues : null,
      tag_product_types: selectedProductTypes.length > 0 ? selectedProductTypes : null,
      tag_product_groups: selectedProductGroups.length > 0 ? selectedProductGroups : null
    };

    onUpdate(updates);
  };

  const handleTagNameChange = (value: SelectionValue) => setTagName(String(value));
  const handleTagIconChange = (value: SelectionValue) => setTagIcon(String(value));
  const handleTagDescriptionChange = (value: SelectionValue) => setTagDescription(String(value));
  const handleTagColorChange = (value: SelectionValue) => setTagColor(String(value));
  const handleTagTypeChange = (value: SelectionValue) => setTagType(String(value) as TagType);
  const handleDisplayModeChange = (value: SelectionValue) => {
    const strValue = String(value);
    setTagDisplayAs(strValue === '' ? null : strValue as 'only_value' | 'images');
  };

  const handleTagValuesChange = (value: SelectionValue) => {
    const values = String(value).split('\n').filter(v => v.trim());
    setTagValues(values);
  };

  const handleProductTypesChange = (value: SelectionValue) => {
    if (Array.isArray(value)) {
      setSelectedProductTypes(value.map(String));
    }
  };

  const handleProductGroupsChange = (value: SelectionValue) => {
    if (Array.isArray(value)) {
      setSelectedProductGroups(value.map(String));
    }
  };

  return (
    <Card>
      <Card.Header
        title={tag.id ? `Edit Tag: ${tag.tag_name}` : 'Create New Tag'}
        icon={<FaTags />}
        iconColor="text-cyan-500"
      />
      <Card.Body>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Tag Name */}
              <FormElement
                elementType="input"
                label="Tag Name"
                labelIcon={<FaTags />}
                labelIconColor="text-cyan-500"
                initialValue={tagName}
                onValueChange={handleTagNameChange}
                disabled={isUpdating}
              />

              {/* Tag Description */}
              <FormElement
                elementType="textarea"
                label="Description"
                initialValue={tagDescription}
                onValueChange={handleTagDescriptionChange}
                disabled={isUpdating}
              />

              {/* Tag Type */}
              <FormElement
                elementType="listsingle"
                label="Tag Type"
                options={[
                  { value: 'boolean', label: 'Boolean' },
                  { value: 'set', label: 'Set' },
                  { value: 'text', label: 'Text' }
                ]}
                selectedOptions={tagType}
                onValueChange={handleTagTypeChange}
                disabled={isUpdating || tagInUse}
              />

              {/* Tag Values (only for set type) */}
              {tagType === 'set' && (
                <FormElement
                  elementType="textarea"
                  label="Possible Values"
                  initialValue={tagValues.join('\n')}
                  onValueChange={handleTagValuesChange}
                  disabled={isUpdating}
                  placeholder="Enter one value per line"
                />
              )}

              {/* Display Mode (only for set type) */}
              {tagType === 'set' && (
                <FormElement
                  elementType="listsingle"
                  label="Display Mode"
                  options={[
                    { value: '', label: 'Default' },
                    { value: 'only_value', label: 'Only Value' },
                    { value: 'images', label: 'Images' }
                  ]}
                  selectedOptions={tagDisplayAs || ''}
                  onValueChange={handleDisplayModeChange}
                  disabled={isUpdating}
                />
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Tag Icon */}
              <div>
                <FormElement
                  elementType="listsingle"
                  label="Icon"
                  options={Object.keys(FaIcons)
                    .filter(name => name.startsWith('Fa'))
                    .map(name => ({ value: name, label: name.replace('Fa', '') }))}
                  selectedOptions={tagIcon}
                  onValueChange={handleTagIconChange}
                  disabled={isUpdating}
                />
                <div className="mt-2 grid grid-cols-8 gap-2 p-2 bg-gray-800 rounded-lg">
                  {Object.entries(FaIcons)
                    .filter(([name]) => name.startsWith('Fa'))
                    .slice(0, 24)
                    .map(([name, Icon]) => (
                      <div
                        key={name}
                        className={clsx(
                          'p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors flex items-center justify-center',
                          tagIcon === name && 'bg-blue-900/50 ring-1 ring-blue-500'
                        )}
                        onClick={() => setTagIcon(name)}
                      >
                        <Icon className="text-lg" />
                      </div>
                    ))}
                </div>
              </div>

              {/* Tag Color */}
              <FormElement
                elementType="listsingle"
                label="Color"
                options={[
                  { value: '', label: 'Default' },
                  { value: 'red', label: 'Red' },
                  { value: 'orange', label: 'Orange' },
                  { value: 'amber', label: 'Amber' },
                  { value: 'yellow', label: 'Yellow' },
                  { value: 'lime', label: 'Lime' },
                  { value: 'green', label: 'Green' },
                  { value: 'emerald', label: 'Emerald' },
                  { value: 'teal', label: 'Teal' },
                  { value: 'cyan', label: 'Cyan' },
                  { value: 'sky', label: 'Sky' },
                  { value: 'blue', label: 'Blue' },
                  { value: 'indigo', label: 'Indigo' },
                  { value: 'violet', label: 'Violet' },
                  { value: 'purple', label: 'Purple' },
                  { value: 'fuchsia', label: 'Fuchsia' },
                  { value: 'pink', label: 'Pink' },
                  { value: 'rose', label: 'Rose' }
                ]}
                selectedOptions={tagColor}
                onValueChange={handleTagColorChange}
                disabled={isUpdating}
              />

              {/* Product Types and Groups */}
              <div className="grid grid-cols-2 gap-4">
                <FormElement
                  elementType="listmultiple"
                  label="Product Types"
                  options={productTypes.map(type => ({ value: type, label: type }))}
                  selectedOptions={selectedProductTypes}
                  onValueChange={handleProductTypesChange}
                  disabled={isUpdating}
                />

                <FormElement
                  elementType="listmultiple"
                  label="Product Groups"
                  options={productGroups.map(group => ({ value: group, label: group }))}
                  selectedOptions={selectedProductGroups}
                  onValueChange={handleProductGroupsChange}
                  disabled={isUpdating}
                />
              </div>
            </div>
          </div>
        </form>
      </Card.Body>
      <Card.Footer>
        <div className="flex justify-end gap-2">
          <Button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600"
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-cyan-700 hover:bg-cyan-600"
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
};

const getTagTypeIcon = (type: TagType) => {
  switch (type) {
    case 'boolean':
      return <FaIcons.FaToggleOn className="text-green-500" />;
    case 'set':
      return <FaIcons.FaList className="text-blue-500" />;
    case 'text':
      return <FaIcons.FaFont className="text-purple-500" />;
    default:
      return <FaIcons.FaQuestionCircle className="text-gray-500" />;
  }
};

export const TagDisplayOrderManager: React.FC<TagDisplayOrderManagerProps> = ({
  tags,
  onUpdateDisplayOrder,
  onUpdateTag,
  isUpdating,
  productTypes = [],
  productGroups = []
}) => {
  const [editingTag, setEditingTag] = React.useState<BaseTag | null>(null);
  const [displayedTags, setDisplayedTags] = React.useState<BaseTag[]>([]);
  const [nonDisplayedTags, setNonDisplayedTags] = React.useState<BaseTag[]>([]);

  // Sort tags into displayed and non-displayed lists
  React.useEffect(() => {
    const displayed = tags
      .filter(tag => tag.tags_display_in_table)
      .sort((a, b) => {
        if (a.tags_display_in_table_order === null) return 1;
        if (b.tags_display_in_table_order === null) return -1;
        return a.tags_display_in_table_order - b.tags_display_in_table_order;
      });

    const nonDisplayed = tags
      .filter(tag => !tag.tags_display_in_table)
      .sort((a, b) => (a.tag_name || '').localeCompare(b.tag_name || ''));

    setDisplayedTags(displayed);
    setNonDisplayedTags(nonDisplayed);
  }, [tags]);

  const handleUpdateTag = async (tagId: number, updates: Partial<BaseTag>) => {
    try {
      await onUpdateTag(tagId, updates);
      setEditingTag(null); // Close modal after successful update
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleMoveTag = (tag: BaseTag, direction: 'up' | 'down') => {
    const currentIndex = displayedTags.findIndex(t => t.id === tag.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= displayedTags.length) return;

    // Create a new array with the moved tag in the new position
    const reorderedTags = [...displayedTags];
    const [movedTag] = reorderedTags.splice(currentIndex, 1);
    reorderedTags.splice(newIndex, 0, movedTag);

    // Update all orders to be sequential
    reorderedTags.forEach((tag, index) => {
      onUpdateDisplayOrder(tag.id, index + 1);
    });
  };

  const handleAddTag = (tagId: number) => {
    const maxOrder = Math.max(...displayedTags.map(t => t.tags_display_in_table_order || 0), 0);
    onUpdateDisplayOrder(tagId, maxOrder + 1);
  };

  const handleRemoveTag = (tagId: number) => {
    onUpdateDisplayOrder(tagId, null);
  };

  const handleCreateTag = async () => {
    const newTag: Partial<BaseTag> = {
      tag_name: '',
      tag_description: '',
      tag_type: 'boolean',
      tag_values: null,
      tags_display_in_table: false,
      tags_display_in_table_order: null,
      tag_product_types: null,
      tag_product_groups: null,
      tag_icon: null,
      tag_icon_color: null,
      tag_display_as: null
    };
    setEditingTag(newTag as BaseTag);
  };

  return (
    <>
      {/* Displayed Tags */}
      <div className="space-y-2">
        {displayedTags.map((tag, index) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg"
          >
            <div className="flex-1 flex items-center gap-2">
              {getTagTypeIcon(tag.tag_type)}
              <span className="text-gray-200">{tag.tag_name}</span>
              {tag.tag_description && (
                <span className="text-gray-400 text-sm">({tag.tag_description})</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="xs"
                onClick={() => handleMoveTag(tag, 'up')}
                disabled={index === 0 || isUpdating}
                className="text-gray-300 hover:text-gray-100"
              >
                ↑
              </Button>
              <Button
                size="xs"
                onClick={() => handleMoveTag(tag, 'down')}
                disabled={index === displayedTags.length - 1 || isUpdating}
                className="text-gray-300 hover:text-gray-100"
              >
                ↓
              </Button>
              <Button
                size="xs"
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isUpdating}
                className="text-gray-300 hover:text-gray-100"
              >
                ×
              </Button>
              <Button
                size="xs"
                onClick={() => setEditingTag(tag)}
                disabled={isUpdating}
                className="text-gray-300 hover:text-gray-100"
              >
                <FaEdit />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Non-displayed Tags */}
      <div className="mt-4">
        <div className="text-sm font-medium text-gray-400 mb-2">Available Tags</div>
        <div className="grid grid-cols-2 gap-2">
          {nonDisplayedTags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg"
            >
              <div className="flex-1 flex items-center gap-2">
                {getTagTypeIcon(tag.tag_type)}
                <span className="text-gray-200">{tag.tag_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="xs"
                  onClick={() => handleAddTag(tag.id)}
                  disabled={isUpdating}
                  className="text-gray-300 hover:text-gray-100"
                >
                  +
                </Button>
                <Button
                  size="xs"
                  onClick={() => setEditingTag(tag)}
                  disabled={isUpdating}
                  className="text-gray-300 hover:text-gray-100"
                >
                  <FaEdit />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create New Tag Button */}
      <Button
        className="mt-4 bg-gray-700 hover:bg-gray-600"
        onClick={handleCreateTag}
        disabled={isUpdating}
      >
        Create New Tag
      </Button>

      {/* Edit Tag Modal */}
      <Modal
        isOpen={!!editingTag}
        onClose={() => setEditingTag(null)}
        size="lg"
      >
        {editingTag && (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingTag.id ? 'Edit Tag' : 'Create New Tag'}
            </h2>
            <TagEditForm
              tag={editingTag}
              onUpdate={(updates) => handleUpdateTag(editingTag.id, updates)}
              isUpdating={isUpdating}
              productTypes={productTypes}
              productGroups={productGroups}
              onClose={() => setEditingTag(null)}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

const TagDisplaySettings = () => {
  const [editingTag, setEditingTag] = React.useState<BaseTag | null>(null);
  
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

  const productTagsColumns = React.useMemo<TableColumn<BaseTag & ProductTag>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      accessor: (tag: BaseTag & ProductTag) => (
        <div className="flex items-center gap-2">
          {tag.tag_icon && (
            <div className="flex items-center">
              {React.createElement(FaIcons[tag.tag_icon as keyof typeof FaIcons], {
                className: clsx(
                  'h-4 w-4',
                  tag.tag_icon_color ? `text-${tag.tag_icon_color}-500` : 'text-gray-500'
                )
              })}
            </div>
          )}
          <span>{tag.tag_name}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (tag: BaseTag) => tag.tag_description || '-',
      width: '40%'
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (tag: BaseTag) => tag.tag_type,
      width: '15%'
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (tag: BaseTag) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="xs"
            onClick={() => handleMoveTag(tag, 'up')}
            disabled={isUpdatingProductOrder}
            className="bg-blue-600 hover:bg-blue-500"
          >
            ↑
          </Button>
          <Button
            size="xs"
            onClick={() => handleMoveTag(tag, 'down')}
            disabled={isUpdatingProductOrder}
            className="bg-blue-600 hover:bg-blue-500"
          >
            ↓
          </Button>
          <Button
            size="xs"
            onClick={() => handleRemoveTag(tag.id)}
            disabled={isUpdatingProductOrder}
            className="bg-red-600 hover:bg-red-500"
          >
            ×
          </Button>
        </div>
      ),
      width: '15%',
      align: 'right' as const
    }
  ], [isUpdatingProductOrder]);

  const inventoryTagsColumns = React.useMemo<TableColumn<BaseTag & InventoryTag>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      accessor: (tag: BaseTag & InventoryTag) => (
        <div className="flex items-center gap-2">
          {tag.tag_icon && (
            <div className="flex items-center">
              {React.createElement(FaIcons[tag.tag_icon as keyof typeof FaIcons], {
                className: clsx(
                  'h-4 w-4',
                  tag.tag_icon_color ? `text-${tag.tag_icon_color}-500` : 'text-gray-500'
                )
              })}
            </div>
          )}
          <span>{tag.tag_name}</span>
        </div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      accessor: (tag: BaseTag) => tag.tag_description || '-',
      width: '40%'
    },
    {
      key: 'type',
      header: 'Type',
      accessor: (tag: BaseTag) => tag.tag_type,
      width: '15%'
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (tag: BaseTag) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="xs"
            onClick={() => handleMoveTag(tag, 'up')}
            disabled={isUpdatingInventoryOrder}
            className="bg-blue-600 hover:bg-blue-500"
          >
            ↑
          </Button>
          <Button
            size="xs"
            onClick={() => handleMoveTag(tag, 'down')}
            disabled={isUpdatingInventoryOrder}
            className="bg-blue-600 hover:bg-blue-500"
          >
            ↓
          </Button>
          <Button
            size="xs"
            onClick={() => handleRemoveTag(tag.id)}
            disabled={isUpdatingInventoryOrder}
            className="bg-red-600 hover:bg-red-500"
          >
            ×
          </Button>
        </div>
      ),
      width: '15%',
      align: 'right' as const
    }
  ], [isUpdatingInventoryOrder]);

  const handleMoveTag = (tag: BaseTag, direction: 'up' | 'down') => {
    const currentIndex = productTags.findIndex(t => t.id === tag.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= productTags.length) return;

    // Create a new array with the moved tag in the new position
    const reorderedTags = [...productTags];
    const [movedTag] = reorderedTags.splice(currentIndex, 1);
    reorderedTags.splice(newIndex, 0, movedTag);

    // Update all orders to be sequential
    reorderedTags.forEach((tag, index) => {
      updateProductTagOrderMutation({ id: tag.id, order: index + 1 });
    });
  };

  const handleRemoveTag = (tagId: number) => {
    updateProductTagOrderMutation({ id: tagId, order: null });
  };

  const handleUpdateTag = (tagId: number, updates: Partial<BaseTag>) => {
    if (editingTag) {
      updateProductTagMutation({ id: tagId, updates });
      setEditingTag(null);
    }
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
              <Table
                columns={productTagsColumns}
                data={productTags}
                keyExtractor={(tag: BaseTag) => String(tag.id)}
                onRowClick={(tag: BaseTag) => setEditingTag(tag)}
                rowClassName="cursor-pointer hover:bg-gray-700/50"
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
              <Table
                columns={inventoryTagsColumns}
                data={inventoryTags}
                keyExtractor={(tag: BaseTag) => String(tag.id)}
                onRowClick={(tag: BaseTag) => setEditingTag(tag)}
                rowClassName="cursor-pointer hover:bg-gray-700/50"
              />
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Single Edit Tag Modal */}
      {editingTag && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTag(null)}
          size="xl"
        >
          <TagEditForm
            tag={editingTag}
            onUpdate={(updates) => handleUpdateTag(editingTag.id, updates)}
            isUpdating={isUpdatingProduct || isUpdatingInventory}
            productTypes={productTypeNames}
            productGroups={productGroupNames}
            onClose={() => setEditingTag(null)}
          />
        </Modal>
      )}
    </Page>
  );
};

export default TagDisplaySettings; 
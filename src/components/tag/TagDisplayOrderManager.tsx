import React from 'react';
import { BaseTag, TagType } from '@/types/tags';
import { FormElement, SelectionValue } from '@/components/formelement/FormElement';
import { Button } from '@/components/ui';
import BaseStyledContainer from '@/components/ui/BaseStyledContainer';
import { FaArrowUp, FaArrowDown, FaTimes, FaEdit, FaSave, FaBan, FaLock, FaToggleOn, FaList, FaFont, FaLayerGroup, FaCubes, FaQuestionCircle, FaBox, FaTag, FaCheck, FaStar, FaHeart, FaFlag, FaBell, FaBookmark, FaClock, FaGem, FaCrown, FaShieldAlt, FaTrophy, FaMedal, FaThumbsUp, FaExclamationCircle, FaInfoCircle, FaGamepad, FaCartPlus, FaStore, FaBoxOpen, FaBarcode, FaQrcode, FaCompactDisc, FaBook, FaUsers, FaCamera, FaTablet, FaFileAlt, FaBookOpen, FaRobot, FaHeadset } from 'react-icons/fa';
import { supabase } from '@/supabaseClient';

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
  const [tagType, setTagType] = React.useState(tag.tag_type);
  const [tagValues, setTagValues] = React.useState<string[]>(tag.tag_values || []);
  const [selectedProductTypes, setSelectedProductTypes] = React.useState<string[]>(tag.tag_product_types || []);
  const [selectedProductGroups, setSelectedProductGroups] = React.useState<string[]>(tag.tag_product_groups || []);
  const [tagIcon, setTagIcon] = React.useState(tag.tag_icon || '');
  const [tagColor, setTagColor] = React.useState(tag.tag_icon_color || '');
  const [tagDisplayAs, setTagDisplayAs] = React.useState(tag.tag_display_as || null);
  const [isTagInUse, setIsTagInUse] = React.useState(false);

  // Check if tag is in use
  React.useEffect(() => {
    const checkTagInUse = async () => {
      try {
        // Check both products and inventory relationship tables
        const [productsResult, inventoryResult] = await Promise.all([
          supabase
            .from('products_tags_relationship')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id),
          supabase
            .from('inventory_tags_relationship')
            .select('*', { count: 'exact', head: true })
            .eq('tag_id', tag.id)
        ]);
        
        const productsCount = productsResult.count || 0;
        const inventoryCount = inventoryResult.count || 0;
        
        setIsTagInUse(productsCount > 0 || inventoryCount > 0);
      } catch (error) {
        console.error('Error checking if tag is in use:', error);
      }
    };

    checkTagInUse();
  }, [tag.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const updates: Partial<BaseTag> = {
        tag_name: tagName,
        tag_description: tagDescription,
        tag_icon: tagIcon || null,
        tag_icon_color: tagColor || null
      };

      // Only include type-related fields if they were actually changed
      if (tagType !== tag.tag_type) {
        updates.tag_type = tagType;
      }
      
      if (tagType === 'set' && tagValues.length === 0) {
        throw new Error('Set type tags must have at least one possible value');
      }

      // Include tag_values if they've changed
      if (JSON.stringify(tagValues) !== JSON.stringify(tag.tag_values)) {
        updates.tag_values = tagValues;
      }

      // Include display mode if it's changed
      if (tagDisplayAs !== tag.tag_display_as) {
        updates.tag_display_as = tagDisplayAs;
      }
      
      if (JSON.stringify(selectedProductTypes) !== JSON.stringify(tag.tag_product_types)) {
        updates.tag_product_types = selectedProductTypes.length > 0 ? selectedProductTypes : null;
      }
      
      if (JSON.stringify(selectedProductGroups) !== JSON.stringify(tag.tag_product_groups)) {
        updates.tag_product_groups = selectedProductGroups.length > 0 ? selectedProductGroups : null;
      }

      // Validate icon starts with 'Fa'
      if (tagIcon && !tagIcon.startsWith('Fa')) {
        throw new Error('Icon name must start with "Fa"');
      }

      await onUpdate(updates);
      onClose();
    } catch (error) {
      console.error('Error updating tag:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while updating the tag');
    }
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
    const strValue = String(value);
    setTagValues(strValue.split('\n'));
  };
  const handleProductTypesChange = (value: SelectionValue) => {
    setSelectedProductTypes(Array.isArray(value) ? value.map(String) : []);
  };
  const handleProductGroupsChange = (value: SelectionValue) => {
    setSelectedProductGroups(Array.isArray(value) ? value.map(String) : []);
  };

  return (
    <div className="p-4 bg-gray-900/50">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        {/* First row: Name, Icon, Color */}
        <div className="grid grid-cols-3 gap-4">
          <FormElement
            elementType="input"
            label="Tag Name"
            labelPosition='above'
            initialValue={tagName}
            onValueChange={handleTagNameChange}
            disabled={isUpdating}
          />
          <div>
            <FormElement
              elementType="input"
              label="Tag Icon"
              labelPosition='above'
              initialValue={tagIcon}
              onValueChange={handleTagIconChange}
              disabled={isUpdating}
            />
            <div className="mt-2 grid grid-cols-7 gap-1 ml-3">
              <FaBox className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaBox')} />
              <FaTag className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaTag')} />
              <FaList className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaList')} />
              <FaCheck className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaCheck')} />
              <FaStar className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaStar')} />
              <FaHeart className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaHeart')} />
              <FaFlag className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaFlag')} />
              <FaBell className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaBell')} />
              <FaBookmark className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaBookmark')} />
              <FaClock className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaClock')} />
              <FaGem className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaGem')} />
              <FaCrown className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaCrown')} />
              <FaShieldAlt className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaShieldAlt')} />
              <FaTrophy className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaTrophy')} />
              <FaMedal className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaMedal')} />
              <FaThumbsUp className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaThumbsUp')} />
              <FaExclamationCircle className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaExclamationCircle')} />
              <FaInfoCircle className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaInfoCircle')} />
              <FaGamepad className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaGamepad')} />
              <FaCartPlus className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaCartPlus')} />
              <FaStore className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaStore')} />
              <FaBoxOpen className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaBoxOpen')} />
              <FaBarcode className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaBarcode')} />
              <FaQrcode className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaQrcode')} />
              <FaCompactDisc className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaCompactDisc')} />
              <FaHeadset className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaHeadset')} />
              <FaRobot className="text-md cursor-pointer hover:text-blue-400 transition-colors" onClick={() => setTagIcon('FaRobot')} />
            </div>
          </div>
          <FormElement
            elementType="listsingle"
            label="Tag Color"
            labelPosition='above'
            selectedOptions={tagColor}
            onValueChange={handleTagColorChange}
            options={[
              { value: '', label: '-' },
              { value: 'red', label: 'red' },
              { value: 'blue', label: 'blue' },
              { value: 'green', label: 'green' },
              { value: 'yellow', label: 'yellow' },
              { value: 'purple', label: 'purple' },
              { value: 'pink', label: 'pink' },
              { value: 'indigo', label: 'indigo' },
              { value: 'gray', label: 'gray' }
            ]}
            disabled={isUpdating}
          />
        </div>

        <FormElement
          elementType="input"
          label="Tag Description"
          labelPosition='above'
          initialValue={tagDescription}
          onValueChange={handleTagDescriptionChange}
          disabled={isUpdating}
        />

        <div className="flex flex-col gap-2">
          {tagType === 'set' && (
            <FormElement
              elementType="listsingle"
              label="Display Mode"
              labelPosition='above'
              selectedOptions={tagDisplayAs || ''}
            onValueChange={handleDisplayModeChange}
            options={[
              { value: '', label: 'Normal' },
              { value: 'only_value', label: 'Only Values' },
              { value: 'images', label: 'Images' }
            ]}
            disabled={isUpdating}
          />
        )}
        </div>
        
          {tagType === 'set' && (
            <FormElement
              elementType="textarea"
              labelPosition='above'
              label="Possible Values (one per line)"
              initialValue={tagValues.join('\n')}
              onValueChange={handleTagValuesChange}
              disabled={isUpdating || isTagInUse}
              rows={4}
            />
          )}

        {/* Type-related fields in one row */}
        <div className="grid grid-cols-4 gap-4">
          <FormElement
            elementType="listsingle"
            label="Tag Type"
            labelPosition='above'
            selectedOptions={tagType}
            onValueChange={handleTagTypeChange}
            options={[
              { value: 'boolean', label: 'Boolean' },
              { value: 'set', label: 'Selection' },
              { value: 'text', label: 'Text' }
            ]}
            disabled={isUpdating || isTagInUse}
          />
          <FormElement
            elementType="listmultiple"
            label="Product Types"
            labelPosition='above'
            selectedOptions={selectedProductTypes}
            onValueChange={handleProductTypesChange}
            options={productTypes.map(type => ({ value: type, label: type }))}
            disabled={isUpdating || isTagInUse}
          />
          <FormElement
            elementType="listmultiple"
            label="Product Groups"
            labelPosition='above'
            selectedOptions={selectedProductGroups}
            onValueChange={handleProductGroupsChange}
            options={productGroups.map(group => ({ value: group, label: group }))}
            disabled={isUpdating || isTagInUse}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} disabled={isUpdating} size="xs" bgColor="bg-red-900">
            Cancel
          </Button>
          <Button type="submit" disabled={isUpdating} size="xs" bgColor="bg-green-900">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
};

// Helper to get tag type icon
const getTagTypeIcon = (type: TagType) => {
  switch (type) {
    case 'boolean':
      return <FaToggleOn className="text-blue-400" />;
    case 'set':
      return <FaList className="text-purple-400" />;
    case 'text':
      return <FaFont className="text-green-400" />;
    default:
      return null;
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
  const [editingTagId, setEditingTagId] = React.useState<number | null>(null);
  const [localTags, setLocalTags] = React.useState(tags);
  const [newTagName, setNewTagName] = React.useState('');

  // Update local tags when props change
  React.useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  // Filter and sort tags using localTags instead of tags prop
  const displayedTags = React.useMemo(() => 
    localTags
      .filter(tag => tag.tags_display_in_table)
      .sort((a, b) => {
        if (!a.tags_display_in_table_order) return 1;
        if (!b.tags_display_in_table_order) return -1;
        return a.tags_display_in_table_order - b.tags_display_in_table_order;
      }),
    [localTags]
  );

  const nonDisplayedTags = React.useMemo(() => 
    localTags.filter(tag => !tag.tags_display_in_table),
    [localTags]
  );

  // Handle optimistic updates
  const handleUpdateTag = async (tagId: number, updates: Partial<BaseTag>) => {
    // Update local state immediately
    setLocalTags(prevTags => 
      prevTags.map(tag => 
        tag.id === tagId ? { ...tag, ...updates } : tag
      )
    );

    // Call the parent update handler
    await onUpdateTag(tagId, updates);
  };

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

  // Add function to create a new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const newTag: Omit<BaseTag, 'id' | 'created_at'> = {
      tag_name: newTagName.trim(),
      tag_description: '',
      tag_type: 'boolean',
      tag_values: [],
      tag_product_types: null,
      tag_product_groups: null,
      tags_display_in_table: false,
      tags_display_in_table_order: null,
      tag_icon: null,
      tag_icon_color: null,
      tag_display_as: null,
      tags_table_filter: false
    };

    try {
      const { data, error } = await supabase
        .from('products_tags')
        .insert([newTag])
        .select()
        .single();

      if (error) throw error;

      setLocalTags(prev => [...prev, data]);
      setNewTagName('');
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Currently displayed tags */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">Displayed Tags</h3>
        <div className="space-y-2">
          {displayedTags.map(tag => (
            <React.Fragment key={tag.id}>
              <div 
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-800/80 border border-gray-700 hover:bg-gray-800/90 cursor-pointer transition-colors"
                onClick={() => setEditingTagId(editingTagId === tag.id ? null : tag.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getTagTypeIcon(tag.tag_type)}
                    <span className="text-sm text-gray-200 font-medium">
                      {tag.tag_name}
                      {tag.tag_type === 'set' && tag.tag_display_as === 'only_value' && (
                        <span className="text-gray-400 ml-2">
                          ({tag.tag_values?.join(', ')})
                        </span>
                      )}
                    </span>
                  </div>
                  {tag.tag_description && (
                    <div className="text-xs text-gray-400 mt-1">{tag.tag_description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {/* Product Types */}
                    <div className="flex items-center gap-1">
                      <FaCubes className="text-xs text-pink-400" />
                      <span className="text-xs text-gray-400">
                        {tag.tag_product_types?.length 
                          ? tag.tag_product_types.join(', ') 
                          : 'All Product Types'}
                      </span>
                    </div>
                    {/* Product Groups */}
                    <div className="flex items-center gap-1 ml-4">
                      <FaLayerGroup className="text-xs text-indigo-400" />
                      <span className="text-xs text-gray-400">
                        {tag.tag_product_groups?.length 
                          ? tag.tag_product_groups.join(', ') 
                          : 'All Product Groups'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTag(tag, 'up');
                    }}
                    disabled={isUpdating || displayedTags.indexOf(tag) === 0}
                    iconLeft={<FaArrowUp />}
                  />
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveTag(tag, 'down');
                    }}
                    disabled={isUpdating || displayedTags.indexOf(tag) === displayedTags.length - 1}
                    iconLeft={<FaArrowDown />}
                  />
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTag(tag.id);
                    }}
                    disabled={isUpdating}
                    iconLeft={<FaTimes />}
                    bgColor="bg-red-900"
                  />
                </div>
              </div>
              {editingTagId === tag.id && (
                <TagEditForm
                  tag={tag}
                  onUpdate={(updates) => handleUpdateTag(tag.id, updates)}
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Available Tags</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name"
              className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
            />
            <Button
              size="xs"
              onClick={handleCreateTag}
              disabled={isUpdating || !newTagName.trim()}
            >
              Add Tag
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          {nonDisplayedTags.map(tag => (
            <React.Fragment key={tag.id}>
              <div 
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:bg-gray-800/60 cursor-pointer transition-colors"
                onClick={() => setEditingTagId(editingTagId === tag.id ? null : tag.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getTagTypeIcon(tag.tag_type)}
                    <span className="text-sm text-gray-400">
                      {tag.tag_name}
                      {tag.tag_type === 'set' && tag.tag_display_as === 'only_value' && (
                        <span className="text-gray-500 ml-2">
                          ({tag.tag_values?.join(', ')})
                        </span>
                      )}
                    </span>
                  </div>
                  {tag.tag_description && (
                    <div className="text-xs text-gray-500 mt-1">{tag.tag_description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {/* Product Types */}
                    <div className="flex items-center gap-1">
                      <FaCubes className="text-xs text-pink-400/75" />
                      <span className="text-xs text-gray-500">
                        {tag.tag_product_types?.length 
                          ? tag.tag_product_types.join(', ') 
                          : 'All Product Types'}
                      </span>
                    </div>
                    {/* Product Groups */}
                    <div className="flex items-center gap-1 ml-4">
                      <FaLayerGroup className="text-xs text-indigo-400/75" />
                      <span className="text-xs text-gray-500">
                        {tag.tag_product_groups?.length 
                          ? tag.tag_product_groups.join(', ') 
                          : 'All Product Groups'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddTag(tag.id);
                    }}
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
                  onUpdate={(updates) => handleUpdateTag(tag.id, updates)}
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
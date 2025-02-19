import React from 'react';
import { Modal } from '@/components/modal/Modal';
import { Card } from '@/components/card';
import { Button } from '@/components/ui';
import { FormElement, type SelectionValue } from '@/components/formelement/FormElement';
import { FormElementLabel } from '@/components/formelement/FormElementLabel';
import { TagWithRelationships } from '@/types/tags';
import { ProductTagService, InventoryTagService } from '@/services/TagService';
import { supabase } from '@/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import * as Icons from 'react-icons/fa';
import { FaTag, FaLayerGroup, FaCubes, FaImage, FaFont, FaIcons, FaPalette, FaCheck } from 'react-icons/fa';
import DisplayError from '@/components/ui/DisplayError';
import { IconGrid, getCommonIconOptions } from '@/components/ui/IconGrid';
import Pill from '@/components/ui/Pill';
import clsx from 'clsx';
import { TagDisplay } from '@/components/tag/TagDisplay';

const colorOptions = [
  { value: 'gray', label: 'Gray' },
  { value: 'red', label: 'Red' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' }
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  return (
    <div className="space-y-2">
      <FormElementLabel
        label={label}
        labelIcon={<FaPalette />}
        labelIconColor="text-yellow-400"
        textSize="xs"
      />
      <div className="flex flex-wrap gap-2">
        {colorOptions.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => onChange(color.value)}
            className={clsx(
              'w-8 h-8 rounded-lg transition-all duration-200',
              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-400',
              `bg-${color.value}-500/20 border-2`,
              value === color.value ? `border-${color.value}-400` : 'border-transparent'
            )}
            title={color.label}
          >
            {value === color.value && (
              <FaCheck className={`w-4 h-4 mx-auto text-${color.value}-400`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tagId: number) => void;
  tag?: TagWithRelationships;
  mode: 'create' | 'edit';
  type: 'product' | 'inventory';
  productGroups: string[];
  productTypes: string[];
}

export const TagModal: React.FC<TagModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tag,
  mode,
  type,
  productGroups,
  productTypes
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [displayType, setDisplayType] = React.useState<'text' | 'icon' | 'image'>('text');
  const [displayValue, setDisplayValue] = React.useState('');
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [color, setColor] = React.useState('gray');

  const service = type === 'product' 
    ? new ProductTagService(supabase, queryClient)
    : new InventoryTagService(supabase, queryClient);

  React.useEffect(() => {
    if (tag) {
      setName(tag.name);
      setDescription(tag.description || '');
      setDisplayType(tag.display_type);
      setDisplayValue(tag.display_value);
      setSelectedGroups(tag.product_groups || []);
      setSelectedTypes(tag.product_types || []);
      setColor(tag.color || 'gray');
    } else {
      setName('');
      setDescription('');
      setDisplayType('text');
      setDisplayValue('');
      setSelectedGroups([]);
      setSelectedTypes([]);
      setColor('gray');
    }
  }, [tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors([]);

    try {
      const tagData = {
        name,
        description,
        display_type: displayType,
        display_value: displayValue,
        product_groups: selectedGroups,
        product_types: selectedTypes,
        color
      };

      if (mode === 'create') {
        const { data, errors } = await service.create(tagData);
        if (errors?.length) throw new Error(errors[0]);
        if (data) onSuccess(data.id);
      } else if (tag) {
        const { errors } = await service.update(tag.id, tagData);
        if (errors?.length) throw new Error(errors[0]);
        onSuccess(tag.id);
      }
    } catch (err: any) {
      setErrors([err.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const iconOptions = [
    // First Row
    { value: 'FaFile', label: 'File', icon: <Icons.FaFile /> },
    { value: 'FaFolder', label: 'Folder', icon: <Icons.FaFolder /> },
    { value: 'FaImage', label: 'Image', icon: <Icons.FaImage /> },
    { value: 'FaVideo', label: 'Video', icon: <Icons.FaVideo /> },
    { value: 'FaMusic', label: 'Music', icon: <Icons.FaMusic /> },
    
    // Second Row
    { value: 'FaGamepad', label: 'Gamepad', icon: <Icons.FaGamepad /> },
    { value: 'FaTag', label: 'Tag', icon: <Icons.FaTag /> },
    { value: 'FaBox', label: 'Box', icon: <Icons.FaBox /> },
    { value: 'FaSmile', label: 'Smile', icon: <Icons.FaSmile /> },
    { value: 'FaCoffee', label: 'Coffee', icon: <Icons.FaCoffee /> },

    // Third Row
    { value: 'FaShoppingCart', label: 'Cart', icon: <Icons.FaShoppingCart /> },
    { value: 'FaDollarSign', label: 'Dollar', icon: <Icons.FaDollarSign /> },
    { value: 'FaStar', label: 'Star', icon: <Icons.FaStar /> },
    { value: 'FaHeart', label: 'Heart', icon: <Icons.FaHeart /> },
    { value: 'FaCheck', label: 'Check', icon: <Icons.FaCheck /> },

    // Fourth Row
    { value: 'FaTimes', label: 'Times', icon: <Icons.FaTimes /> },
    { value: 'FaExclamation', label: 'Exclamation', icon: <Icons.FaExclamation /> },
    { value: 'FaQuestion', label: 'Question', icon: <Icons.FaQuestion /> },
    { value: 'FaInfo', label: 'Info', icon: <Icons.FaInfo /> },
    { value: 'FaCog', label: 'Settings', icon: <Icons.FaCog /> },

    // Fifth Row
    { value: 'FaUser', label: 'User', icon: <Icons.FaUser /> },
    { value: 'FaUsers', label: 'Users', icon: <Icons.FaUsers /> },
    { value: 'FaGlobe', label: 'Globe', icon: <Icons.FaGlobe /> },
    { value: 'FaHome', label: 'Home', icon: <Icons.FaHome /> },
    { value: 'FaBookmark', label: 'Bookmark', icon: <Icons.FaBookmark /> }
  ];

  const getDisplayTypeIcon = () => {
    switch (displayType) {
      case 'text':
        return <FaFont />;
      case 'icon':
        return <FaIcons />;
      case 'image':
        return <FaImage />;
      default:
        return <FaFont />;
    }
  };

  const handleDisplayTypeChange = (value: SelectionValue) => {
    const newType = String(value) as 'text' | 'icon' | 'image';
    setDisplayType(newType);
    if (newType === 'icon') {
      setDisplayValue('FaTag');
    } else {
      setDisplayValue('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <Card modal className="w-[600px]">
        <Card.Header
          icon={<FaTag />}
          iconColor="text-purple-500"
          title={`${mode === 'create' ? 'New' : 'Edit'} ${type === 'product' ? 'Product' : 'Inventory'} Tag`}
          bgColor="bg-purple-500/50"
          rightContent={
            tag ? `ID: ${tag.id}` : undefined
          }
        />
        <Card.Body className="!p-4">
          <form id="tag-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-12 gap-4">
              {/* Preview Column */}
              <div className="col-span-4">
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <h3 className="text-xs font-medium text-gray-400 mb-2">Preview</h3>
                  <div className="aspect-square w-full flex items-center justify-center bg-gray-800 rounded-lg p-3">
                    {displayType === 'icon' && displayValue ? (
                      React.createElement((Icons as any)[displayValue], {
                        className: `w-6 h-6 text-${color}-500`
                      })
                    ) : displayType === 'image' && displayValue ? (
                      <img
                        src={displayValue}
                        alt="Tag preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : displayType === 'text' && displayValue ? (
                      <Pill
                        bgColor={`bg-${color}-500/20`}
                        textColor={`text-${color}-400`}
                        className="!text-xs"
                      >
                        {displayValue}
                      </Pill>
                    ) : (
                      <div className="text-gray-500 text-xs">
                        No preview
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Column */}
              <div className="col-span-8 space-y-3">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <FormElement
                    elementType="input"
                    label="Name"
                    labelIcon={<FaTag />}
                    labelIconColor="text-purple-400"
                    initialValue={name}
                    onValueChange={(value) => setName(String(value))}
                    labelPosition="above"
                  />
                  <FormElement
                    elementType="select"
                    label="Display Type"
                    labelIcon={getDisplayTypeIcon()}
                    labelIconColor="text-blue-400"
                    initialValue={displayType}
                    onValueChange={handleDisplayTypeChange}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'icon', label: 'Icon' },
                      { value: 'image', label: 'Image' }
                    ]}
                    labelPosition="above"
                  />
                </div>

                {/* Display Value */}
                <div className="space-y-3">
                  {displayType === 'text' && (
                    <div className="space-y-3">
                      <FormElement
                        elementType="input"
                        label="Display Text"
                        labelIcon={<FaFont />}
                        labelIconColor="text-green-400"
                        initialValue={displayValue}
                        onValueChange={(value) => setDisplayValue(String(value))}
                        labelPosition="above"
                      />
                      <ColorPicker
                        label="Pill Color"
                        value={color}
                        onChange={setColor}
                      />
                    </div>
                  )}

                  {displayType === 'icon' && (
                    <div className="space-y-3">
                      <FormElementLabel
                        label="Icon"
                        labelIcon={<FaIcons />}
                        labelIconColor="text-yellow-400"
                        textSize="xs"
                      />
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                        <IconGrid
                          options={iconOptions}
                          value={displayValue}
                          onChange={setDisplayValue}
                          size="sm"
                          className="max-w-[300px]"
                        />
                      </div>
                      <ColorPicker
                        label="Icon Color"
                        value={color}
                        onChange={setColor}
                      />
                    </div>
                  )}

                  {displayType === 'image' && (
                    <FormElement
                      elementType="input"
                      label="Image Path"
                      labelIcon={<FaImage />}
                      labelIconColor="text-blue-400"
                      initialValue={displayValue}
                      onValueChange={(value) => setDisplayValue(String(value))}
                      placeholder="/images/tags/example.png"
                      labelPosition="above"
                    />
                  )}
                </div>

                {/* Description */}
                <FormElement
                  elementType="textarea"
                  label="Description"
                  labelIcon={<FaLayerGroup />}
                  labelIconColor="text-indigo-400"
                  initialValue='{description}'
                  onValueChange={(value) => setDescription(String(value))}
                  rows={2}
                  labelPosition="above"
                />

                {/* Product Groups and Types */}
                <div className="grid grid-cols-2 gap-3">
                  <FormElement
                    elementType="listmultiple"
                    label="Product Groups"
                    labelIcon={<FaLayerGroup />}
                    labelIconColor="text-orange-400"
                    options={productGroups.map(group => ({ value: group, label: group }))}
                    selectedOptions={selectedGroups}
                    onValueChange={(value) => setSelectedGroups(value as string[])}
                    labelPosition="above"
                    placeholder="Select groups..."
                    showResetPill
                  />

                  <FormElement
                    elementType="listmultiple"
                    label="Product Types"
                    labelIcon={<FaCubes />}
                    labelIconColor="text-teal-400"
                    options={productTypes.map(type => ({ value: type, label: type }))}
                    selectedOptions={selectedTypes}
                    onValueChange={(value) => setSelectedTypes(value as string[])}
                    labelPosition="above"
                    placeholder="Select types..."
                    showResetPill
                  />
                </div>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-4">
                <DisplayError
                  errors={errors}
                  bgColor="bg-red-900/30"
                  borderColor="border-red-900/50"
                  textColor="text-red-300"
                />
              </div>
            )}
          </form>
        </Card.Body>
        <Card.Footer className="flex justify-end gap-2 bg-gray-900/50">
          <Button
            onClick={onClose}
            bgColor="bg-gray-700"
            hoverEffect="scale"
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => handleSubmit(e as any)}
            bgColor="bg-purple-600"
            hoverEffect="scale"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}; 
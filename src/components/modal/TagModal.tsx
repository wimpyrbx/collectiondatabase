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
import { FaTag, FaLayerGroup, FaCubes, FaImage, FaFont, FaIcons, FaPalette, FaCheck, FaRandom } from 'react-icons/fa';
import DisplayError from '@/components/ui/DisplayError';
import { IconGrid, getCommonIconOptions } from '@/components/ui/IconGrid';
import Pill from '@/components/ui/Pill';
import clsx from 'clsx';
import { TagDisplay } from '@/components/tag/TagDisplay';

const colorOptions = [
  // Core Colors - these are guaranteed to work with Tailwind
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'pink', label: 'Pink' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'orange', label: 'Orange' },
  { value: 'teal', label: 'Teal' },
  { value: 'gray', label: 'Gray' }
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
              `bg-${color.value}-500`,
              value === color.value ? `ring-2 ring-${color.value}-400 ring-offset-2 ring-offset-gray-900` : 'ring-0'
            )}
            title={color.label}
          >
            {value === color.value && (
              <FaCheck className="w-4 h-4 mx-auto text-white" />
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
    // Clear errors when modal opens
    setErrors([]);
  }, [tag, isOpen]);

  const handleClose = () => {
    // Clear errors when modal closes
    setErrors([]);
    onClose();
  };

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
    // Row 1 - Basic Items
    { value: 'FaBox', label: 'Box', icon: <Icons.FaBox /> },
    { value: 'FaBoxOpen', label: 'Box Open', icon: <Icons.FaBoxOpen /> },
    { value: 'FaBoxes', label: 'Boxes', icon: <Icons.FaBoxes /> },
    { value: 'FaCube', label: 'Cube', icon: <Icons.FaCube /> },
    { value: 'FaCubes', label: 'Cubes', icon: <Icons.FaCubes /> },
    { value: 'FaArchive', label: 'Archive', icon: <Icons.FaArchive /> },
    { value: 'FaFolder', label: 'Folder', icon: <Icons.FaFolder /> },
    { value: 'FaFile', label: 'File', icon: <Icons.FaFile /> },
    { value: 'FaTag', label: 'Tag', icon: <Icons.FaTag /> },
    { value: 'FaTags', label: 'Tags', icon: <Icons.FaTags /> },

    // Row 2 - Groups and Collections
    { value: 'FaLayerGroup', label: 'Layer Group', icon: <Icons.FaLayerGroup /> },
    { value: 'FaObjectGroup', label: 'Object Group', icon: <Icons.FaObjectGroup /> },
    { value: 'FaUsers', label: 'Users Group', icon: <Icons.FaUsers /> },
    { value: 'FaUserFriends', label: 'User Friends', icon: <Icons.FaUserFriends /> },
    { value: 'FaThLarge', label: 'Grid', icon: <Icons.FaThLarge /> },
    { value: 'FaTh', label: 'Grid Small', icon: <Icons.FaTh /> },
    { value: 'FaThList', label: 'Grid List', icon: <Icons.FaThList /> },
    { value: 'FaList', label: 'List', icon: <Icons.FaList /> },
    { value: 'FaListAlt', label: 'List Alt', icon: <Icons.FaListAlt /> },
    { value: 'FaClone', label: 'Clone', icon: <Icons.FaClone /> },

    // Row 3 - Media and Content
    { value: 'FaImage', label: 'Image', icon: <Icons.FaImage /> },
    { value: 'FaImages', label: 'Images', icon: <Icons.FaImages /> },
    { value: 'FaVideo', label: 'Video', icon: <Icons.FaVideo /> },
    { value: 'FaFilm', label: 'Film', icon: <Icons.FaFilm /> },
    { value: 'FaMusic', label: 'Music', icon: <Icons.FaMusic /> },
    { value: 'FaGamepad', label: 'Gamepad', icon: <Icons.FaGamepad /> },
    { value: 'FaPuzzlePiece', label: 'Puzzle', icon: <Icons.FaPuzzlePiece /> },
    { value: 'FaDice', label: 'Dice', icon: <Icons.FaDice /> },
    { value: 'FaBook', label: 'Book', icon: <Icons.FaBook /> },
    { value: 'FaBookOpen', label: 'Book Open', icon: <Icons.FaBookOpen /> },

    // Row 4 - Status and Actions
    { value: 'FaShoppingCart', label: 'Cart', icon: <Icons.FaShoppingCart /> },
    { value: 'FaStore', label: 'Store', icon: <Icons.FaStore /> },
    { value: 'FaDollarSign', label: 'Dollar', icon: <Icons.FaDollarSign /> },
    { value: 'FaStar', label: 'Star', icon: <Icons.FaStar /> },
    { value: 'FaHeart', label: 'Heart', icon: <Icons.FaHeart /> },
    { value: 'FaCheck', label: 'Check', icon: <Icons.FaCheck /> },
    { value: 'FaTimes', label: 'Times', icon: <Icons.FaTimes /> },
    { value: 'FaExclamation', label: 'Exclamation', icon: <Icons.FaExclamation /> },
    { value: 'FaQuestion', label: 'Question', icon: <Icons.FaQuestion /> },
    { value: 'FaInfo', label: 'Info', icon: <Icons.FaInfo /> },

    // Row 5 - Miscellaneous
    { value: 'FaGlobe', label: 'Globe', icon: <Icons.FaGlobe /> },
    { value: 'FaHome', label: 'Home', icon: <Icons.FaHome /> },
    { value: 'FaBookmark', label: 'Bookmark', icon: <Icons.FaBookmark /> },
    { value: 'FaCog', label: 'Settings', icon: <Icons.FaCog /> },
    { value: 'FaTools', label: 'Tools', icon: <Icons.FaTools /> },
    { value: 'FaWrench', label: 'Wrench', icon: <Icons.FaWrench /> },
    { value: 'FaSearch', label: 'Search', icon: <Icons.FaSearch /> },
    { value: 'FaFilter', label: 'Filter', icon: <Icons.FaFilter /> },
    { value: 'FaSort', label: 'Sort', icon: <Icons.FaSort /> },
    { value: 'FaRandom', label: 'Random', icon: <Icons.FaRandom /> }
  ];

  // Add additional icons for random selection
  const additionalIcons = [
    // Original icons
    { value: 'FaAdjust', label: 'Adjust', icon: <Icons.FaAdjust /> },
    { value: 'FaAsterisk', label: 'Asterisk', icon: <Icons.FaAsterisk /> },
    { value: 'FaBell', label: 'Bell', icon: <Icons.FaBell /> },
    { value: 'FaBolt', label: 'Bolt', icon: <Icons.FaBolt /> },
    { value: 'FaBullhorn', label: 'Bullhorn', icon: <Icons.FaBullhorn /> },
    { value: 'FaCamera', label: 'Camera', icon: <Icons.FaCamera /> },
    { value: 'FaChartBar', label: 'Chart Bar', icon: <Icons.FaChartBar /> },
    { value: 'FaCloud', label: 'Cloud', icon: <Icons.FaCloud /> },
    { value: 'FaCode', label: 'Code', icon: <Icons.FaCode /> },
    { value: 'FaCompass', label: 'Compass', icon: <Icons.FaCompass /> },
    { value: 'FaCrown', label: 'Crown', icon: <Icons.FaCrown /> },
    { value: 'FaDatabase', label: 'Database', icon: <Icons.FaDatabase /> },
    { value: 'FaEnvelope', label: 'Envelope', icon: <Icons.FaEnvelope /> },
    { value: 'FaEye', label: 'Eye', icon: <Icons.FaEye /> },
    { value: 'FaFlag', label: 'Flag', icon: <Icons.FaFlag /> },
    { value: 'FaGem', label: 'Gem', icon: <Icons.FaGem /> },
    { value: 'FaGift', label: 'Gift', icon: <Icons.FaGift /> },
    { value: 'FaGraduationCap', label: 'Graduation Cap', icon: <Icons.FaGraduationCap /> },
    { value: 'FaKey', label: 'Key', icon: <Icons.FaKey /> },
    { value: 'FaLeaf', label: 'Leaf', icon: <Icons.FaLeaf /> },
    { value: 'FaLightbulb', label: 'Lightbulb', icon: <Icons.FaLightbulb /> },
    { value: 'FaMagic', label: 'Magic', icon: <Icons.FaMagic /> },
    { value: 'FaMap', label: 'Map', icon: <Icons.FaMap /> },
    { value: 'FaMedal', label: 'Medal', icon: <Icons.FaMedal /> },
    { value: 'FaMicrophone', label: 'Microphone', icon: <Icons.FaMicrophone /> },
    { value: 'FaPalette', label: 'Palette', icon: <Icons.FaPalette /> },
    { value: 'FaPaperPlane', label: 'Paper Plane', icon: <Icons.FaPaperPlane /> },
    { value: 'FaRocket', label: 'Rocket', icon: <Icons.FaRocket /> },
    { value: 'FaShieldAlt', label: 'Shield', icon: <Icons.FaShieldAlt /> },
    { value: 'FaTrophy', label: 'Trophy', icon: <Icons.FaTrophy /> },
    // Additional new icons
    { value: 'FaAnchor', label: 'Anchor', icon: <Icons.FaAnchor /> },
    { value: 'FaAtom', label: 'Atom', icon: <Icons.FaAtom /> },
    { value: 'FaBrain', label: 'Brain', icon: <Icons.FaBrain /> },
    { value: 'FaBriefcase', label: 'Briefcase', icon: <Icons.FaBriefcase /> },
    { value: 'FaBug', label: 'Bug', icon: <Icons.FaBug /> },
    { value: 'FaBuilding', label: 'Building', icon: <Icons.FaBuilding /> },
    { value: 'FaCar', label: 'Car', icon: <Icons.FaCar /> },
    { value: 'FaChess', label: 'Chess', icon: <Icons.FaChess /> },
    { value: 'FaChild', label: 'Child', icon: <Icons.FaChild /> },
    { value: 'FaCoins', label: 'Coins', icon: <Icons.FaCoins /> },
    { value: 'FaDrum', label: 'Drum', icon: <Icons.FaDrum /> },
    { value: 'FaFeather', label: 'Feather', icon: <Icons.FaFeather /> },
    { value: 'FaFire', label: 'Fire', icon: <Icons.FaFire /> },
    { value: 'FaFlask', label: 'Flask', icon: <Icons.FaFlask /> },
    { value: 'FaFootballBall', label: 'Football', icon: <Icons.FaFootballBall /> },
    { value: 'FaGuitar', label: 'Guitar', icon: <Icons.FaGuitar /> },
    { value: 'FaHammer', label: 'Hammer', icon: <Icons.FaHammer /> },
    { value: 'FaHandshake', label: 'Handshake', icon: <Icons.FaHandshake /> },
    { value: 'FaHeadphones', label: 'Headphones', icon: <Icons.FaHeadphones /> },
    { value: 'FaHorse', label: 'Horse', icon: <Icons.FaHorse /> },
    { value: 'FaIceCream', label: 'Ice Cream', icon: <Icons.FaIceCream /> },
    { value: 'FaKeyboard', label: 'Keyboard', icon: <Icons.FaKeyboard /> },
    { value: 'FaLaptop', label: 'Laptop', icon: <Icons.FaLaptop /> },
    { value: 'FaMoon', label: 'Moon', icon: <Icons.FaMoon /> },
    { value: 'FaMountain', label: 'Mountain', icon: <Icons.FaMountain /> },
    { value: 'FaPaintBrush', label: 'Paint Brush', icon: <Icons.FaPaintBrush /> },
    { value: 'FaPaw', label: 'Paw', icon: <Icons.FaPaw /> },
    { value: 'FaPlane', label: 'Plane', icon: <Icons.FaPlane /> },
    { value: 'FaRing', label: 'Ring', icon: <Icons.FaRing /> },
    { value: 'FaSeedling', label: 'Seedling', icon: <Icons.FaSeedling /> },
    { value: 'FaSnowflake', label: 'Snowflake', icon: <Icons.FaSnowflake /> },
    { value: 'FaSpaceShuttle', label: 'Space Shuttle', icon: <Icons.FaSpaceShuttle /> },
    { value: 'FaSun', label: 'Sun', icon: <Icons.FaSun /> },
    { value: 'FaTheaterMasks', label: 'Theater Masks', icon: <Icons.FaTheaterMasks /> },
    { value: 'FaTree', label: 'Tree', icon: <Icons.FaTree /> },
    { value: 'FaUmbrella', label: 'Umbrella', icon: <Icons.FaUmbrella /> },
    { value: 'FaVolleyballBall', label: 'Volleyball', icon: <Icons.FaVolleyballBall /> },
    { value: 'FaWifi', label: 'Wifi', icon: <Icons.FaWifi /> },
    { value: 'FaWind', label: 'Wind', icon: <Icons.FaWind /> }
  ];

  const [randomIcons, setRandomIcons] = React.useState<typeof additionalIcons>([]);

  const handleRandomize = () => {
    // Create a copy of the array and shuffle it
    const shuffled = [...additionalIcons].sort(() => Math.random() - 0.5);
    // Take the first 30 icons (10x3 grid)
    const selected = shuffled.slice(0, 30);
    setRandomIcons(selected);
  };

  // Initialize random icons on mount
  React.useEffect(() => {
    handleRandomize();
  }, []);

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
      setDisplayValue('FaBox');
    } else if (newType === 'text') {
      setDisplayValue('');
    } else if (newType === 'image') {
      setDisplayValue('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <Card modal className="w-[800px]">
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
                        className: clsx(
                          `w-24 h-24`,
                          `text-${color}-500`,
                          `hover:text-${color}-400`,
                          'transition-all duration-200'
                        )
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
                        className="!text-lg"
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
                      <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 overflow-auto max-h-[400px]">
                        <div className="space-y-6">
                          {/* Main Icons */}
                          <div>
                            <IconGrid
                              options={iconOptions}
                              value={displayValue}
                              onChange={setDisplayValue}
                              size="sm"
                              className="grid-cols-10 gap-2"
                              iconColor={`text-${color}-500`}
                              selectedIconColor={`text-${color}-400`}
                            />
                          </div>

                          {/* Random Icons Section */}
                          <div className="border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400">Additional Random Icons</span>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRandomize();
                                }}
                                bgColor="bg-indigo-900/50"
                                size="xs"
                                className="flex items-center gap-1"
                                type="button"
                              >
                                <FaRandom className="w-3 h-3" />
                                Randomize
                              </Button>
                            </div>
                            <IconGrid
                              options={randomIcons}
                              value={displayValue}
                              onChange={setDisplayValue}
                              size="sm"
                              className="grid-cols-10 gap-2"
                              iconColor={`text-${color}-500`}
                              selectedIconColor={`text-${color}-400`}
                            />
                          </div>
                        </div>
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
                  initialValue={description}
                  onValueChange={(value) => setDescription(String(value))}
                  rows={4}
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
            onClick={handleClose}
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
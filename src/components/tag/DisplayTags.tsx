import React from 'react';
import { useTagsCache } from '@/hooks/useTagsCache';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useInventoryTagsCache } from '@/hooks/useInventoryTagsCache';
import Pill from '@/components/ui/Pill';
import { BaseTag } from '@/types/tags';
import * as FaIcons from 'react-icons/fa';

interface DisplayTagsProps {
  id: number;
  tagScope: 'products' | 'inventory';
  className?: string;
}

export const DisplayTags: React.FC<DisplayTagsProps> = ({
  id,
  tagScope,
  className = ''
}) => {
  const { data: relationshipData } = useTagsCache();
  const { data: productTags = [] } = useProductTagsCache();
  const { data: inventoryTags = [] } = useInventoryTagsCache();

  // Get the appropriate tags based on scope
  const availableTags = tagScope === 'products' ? productTags : inventoryTags;

  // Get tags from relationship data
  const tags = React.useMemo(() => {
    if (!relationshipData?.combined_data[tagScope]) return [];
    return relationshipData.combined_data[tagScope][id.toString()] || [];
  }, [relationshipData, tagScope, id]);

  if (!tags || tags.length === 0) return null;

  const renderTagContent = (tagData: BaseTag, tagName: string, tagValue: string | null) => {
    if (tagData.tag_type !== 'set' || !tagValue) {
      return tagValue ? `${tagName}: ${tagValue}` : tagName;
    }

    switch (tagData.tag_display_as) {
      case 'only_value':
        return tagValue;
      case 'images':
        return (
          <img 
            src={`/images/tags/${tagName.toLowerCase()}/${tagValue.toLowerCase()}.webp`}
            alt={`${tagName}: ${tagValue}`}
            className="h-4 w-4 object-contain"
          />
        );
      default:
        return `${tagName}: ${tagValue}`;
    }
  };

  const getIconElement = (iconName: string | null) => {
    if (!iconName) return null;
    // @ts-ignore - FaIcons will have the icon as a property
    const IconComponent = FaIcons[iconName as keyof typeof FaIcons];
    return IconComponent ? <IconComponent /> : null;
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => {
        const [tagName, tagValue] = tag.split('=');
        const tagData = availableTags?.find((t: BaseTag) => t.tag_name === tagName);
        if (!tagData) return null;

        const iconColor = tagData.tag_icon_color ? `text-${tagData.tag_icon_color}-500` : 'text-gray-200';
        const bgColor = tagData.tag_icon_color ? `bg-${tagData.tag_icon_color || 'gray'}-700/50` : 'bg-gray-700';
        const textColor = 'text-white';

        return (
          <Pill 
            key={tag}
            textColor={textColor}
            icon={getIconElement(tagData.tag_icon)}
            iconColor={iconColor}
            bgColor={bgColor}
            className="text-xs"
          >
            {renderTagContent(tagData, tagName, tagValue)}
          </Pill>
        );
      })}
    </div>
  );
};

export default DisplayTags; 
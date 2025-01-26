import React from 'react';
import { useTagsCache } from '@/hooks/useTagsCache';
import Pill from '@/components/ui/Pill';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { useInventoryTagsCache } from '@/hooks/useInventoryTagsCache';
import { twMerge } from 'tailwind-merge';

interface DisplayTagsProps {
  id: number;
  tagScope: 'products' | 'inventory';
  className?: string;
}

export const DisplayTags: React.FC<DisplayTagsProps> = ({ id, tagScope, className }) => {
  const { getTags } = useTagsCache();
  const { data: productTags } = useProductTagsCache();
  const { data: inventoryTags } = useInventoryTagsCache();

  const availableTags = tagScope === 'products' ? productTags : inventoryTags;
  const tags = getTags(id, tagScope);

  if (!tags || tags.length === 0) return null;

  return (
    <div className={twMerge('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => {
        const [name, value] = tag.split('=');
        const tagData = availableTags?.find(t => t.tag_name === name);
        
        if (!tagData) return null;

        return (
          <Pill
            key={name}
            icon={tagData.tag_icon}
            iconColor={tagData.tag_icon_color ? `text-${tagData.tag_icon_color}-500` : 'text-gray-500'}
            className={tagData.tag_icon_color ? `bg-${tagData.tag_icon_color}-700` : 'bg-gray-700'}
          >
            {value ? `${name}: ${value}` : name}
          </Pill>
        );
      })}
    </div>
  );
}; 

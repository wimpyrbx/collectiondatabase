import React from 'react';
import clsx from 'clsx';
import * as Icons from 'react-icons/fa';
import { FaCheck } from 'react-icons/fa';
import { TagWithRelationships } from '@/types/tags';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TooltipStyle } from '@/utils/tooltip';

interface TagButtonProps {
  tag: TagWithRelationships;
  isSelected: boolean;
  onToggle: (tag: TagWithRelationships) => void;
  isProcessing?: boolean;
}

export const TagButton: React.FC<TagButtonProps> = ({ 
  tag, 
  isSelected, 
  onToggle, 
  isProcessing 
}) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const { color = 'gray' } = tag;

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onToggle(tag)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isProcessing}
        className={clsx(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
          isSelected ? ["bg-green-500/20", "text-green-300"] : ["bg-gray-800 hover:bg-gray-700", "text-gray-300"],
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        {tag.display_type === 'icon' && tag.display_value ? (
          React.createElement((Icons as any)[tag.display_value], {
            className: clsx("w-3 h-3", "text-white", "mr-1")
          })
        ) : tag.display_type === 'image' && tag.display_value ? (
          <img
            src={tag.display_value}
            alt={tag.name}
            className="w-4 h-4"
          />
        ) : null}
        <span className="text-sm">{tag.name}</span>
        {isSelected && (
          <FaCheck className="w-3 h-3" />
        )}
      </button>
      <Tooltip
        text={isProcessing ? 'Processing...' : `Click to ${isSelected ? 'remove' : 'add'} ${tag.name} tag`}
        isOpen={isHovered}
        elementRef={buttonRef}
        placement="top"
        size="sm"
        style={TooltipStyle.minimal}
      />
    </div>
  );
};

export default TagButton; 
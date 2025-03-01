import React from 'react';
import clsx from 'clsx';
import { FaTags, FaInfoCircle } from 'react-icons/fa';
import { TagWithRelationships, TagInfo } from '@/types/tags';
import { TagButton } from './TagButton';
import { TagDisplay } from '@/components/tag/TagDisplay';

interface TagsSectionProps {
  availableTags: TagWithRelationships[];
  selectedTags: TagWithRelationships[];
  isLoadingTags: boolean;
  isConnectedToSale: boolean;
  isTagPanelProcessing: boolean;
  isTagProcessing: Record<number, boolean>;
  handleTagToggle: (tag: TagWithRelationships) => void;
  productTags?: TagInfo[];
}

export const TagsSection: React.FC<TagsSectionProps> = ({
  availableTags,
  selectedTags,
  isLoadingTags,
  isConnectedToSale,
  isTagPanelProcessing,
  isTagProcessing,
  handleTagToggle,
  productTags = []
}) => {
  return (
    <div className="bg-gray-900/50 rounded-lg overflow-hidden relative">
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaTags className="text-purple-400" />
          Inventory Tags
          {isConnectedToSale && (
            <span className="text-xs text-gray-400 ml-2">
              * Can't change tags while connected to a sale
            </span>
          )}
        </h3>
      </div>
      <div className="p-4 relative">
        {/* Loading Overlay */}
        {isTagPanelProcessing && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-5 h-5 border-b border-current border-t-transparent rounded-full animate-spin" />
              <span>Processing tags...</span>
            </div>
          </div>
        )}
        
        {/* Inventory Tags Section */}
        <div>
          <div className="flex items-center gap-2 mb-2 text-gray-300">
            <FaTags className="text-purple-400" />
            <span className="text-sm font-medium">Inventory-specific Tags</span>
            <span className="text-xs text-gray-400">(can be added/removed)</span>
          </div>
          <div className={clsx(
            "flex flex-wrap gap-2",
            isConnectedToSale && "opacity-70 pointer-events-none"
          )}>
            {isLoadingTags ? (
              <div className="text-gray-400 text-sm">Loading tags...</div>
            ) : availableTags.length === 0 ? (
              <div className="text-gray-400 text-sm">No tags available</div>
            ) : (
              availableTags.map(tag => (
                <TagButton
                  key={tag.id}
                  tag={tag}
                  isSelected={selectedTags.some(t => t.id === tag.id)}
                  onToggle={handleTagToggle}
                  isProcessing={isTagProcessing[tag.id]}
                />
              ))
            )}
          </div>
        </div>
        
      </div>
    </div>

  );
};

export default TagsSection; 
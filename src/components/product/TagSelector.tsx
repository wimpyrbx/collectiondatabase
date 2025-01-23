import React from 'react';
import { useProductTagsCache } from '@/hooks/useProductTagsCache';
import { FaTags } from 'react-icons/fa';
import clsx from 'clsx';

interface TagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  selectedTags,
  onTagsChange,
  className = ''
}) => {
  const { data: availableTags = [], isLoading } = useProductTagsCache();

  const handleTagClick = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading tags...</div>;
  }

  return (
    <div className={className}>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
        <FaTags className="text-blue-400" />
        <span>Tags</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {availableTags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleTagClick(tag.name)}
            className={clsx(
              'px-3 py-1 text-sm rounded-full transition-all duration-200',
              'border hover:border-blue-400',
              selectedTags.includes(tag.name)
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                : 'bg-gray-800/50 text-gray-400 border-gray-700/30 hover:text-blue-300'
            )}
          >
            {tag.name}
            {tag.description && (
              <span className="text-xs text-gray-500 ml-1">({tag.description})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}; 
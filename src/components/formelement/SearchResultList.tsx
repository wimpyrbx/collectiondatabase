import React, { useState, useEffect, useRef, forwardRef } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import clsx from 'clsx';
import { FormElementLabel } from './FormElementLabel';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchOption {
  value: string;
  label: string;
  description?: string;
}

export interface SearchResultListProps {
  options: SearchOption[];
  selectedOption?: SearchOption | null;
  onSelect: (option: SearchOption | null) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  label?: string;
  labelIcon?: React.ReactNode;
  labelIconColor?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxResults?: number;
}

const SearchResultList = forwardRef<HTMLInputElement, SearchResultListProps>(({
  options,
  selectedOption,
  onSelect,
  onKeyDown,
  label,
  labelIcon,
  labelIconColor,
  placeholder = 'Search...',
  className = '',
  disabled = false,
  maxResults = 10
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!debouncedSearchTerm) return [];
    
    return options
      .filter(option => 
        option.label.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        option.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
      .slice(0, maxResults);
  }, [options, debouncedSearchTerm, maxResults]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Call the external onKeyDown handler first
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => 
          i < filteredOptions.length - 1 ? i + 1 : i
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => i > 0 ? i - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option: SearchOption) => {
    onSelect(option);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(0);
  };

  const handleClear = () => {
    onSelect(null);
    setSearchTerm('');
    setIsOpen(false);
    setHighlightedIndex(0);
    if (ref && 'current' in ref) {
      ref.current?.focus();
    }
  };

  return (
    <div className={clsx('relative', className)} ref={containerRef}>
      {label && (
        <FormElementLabel
          label={label}
          labelIcon={labelIcon}
          labelIconColor={labelIconColor}
          disabled={disabled}
        />
      )}
      
      <div className="relative">
        {/* Search Input */}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            disabled={disabled}
            className={clsx(
              'w-full px-3 py-2 bg-gray-900 text-gray-300 rounded-lg',
              'border border-gray-700 focus:border-blue-500',
              'placeholder-gray-500',
              'transition-colors duration-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          
          {/* Search Icon or Clear Button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {selectedOption ? (
              <button
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <FaTimes />
              </button>
            ) : (
              <FaSearch className="text-gray-500" />
            )}
          </div>
        </div>

        {/* Results Dropdown */}
        {isOpen && filteredOptions.length > 0 && (
          <div
            ref={listRef}
            className={clsx(
              'absolute z-50 w-full mt-1',
              'bg-gray-800 rounded-lg',
              'border border-gray-700',
              'shadow-lg shadow-black/50',
              'max-h-[300px] overflow-y-auto'
            )}
          >
            {filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={clsx(
                  'px-3 py-2 cursor-pointer',
                  'transition-colors duration-150',
                  index === highlightedIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50',
                  index !== filteredOptions.length - 1 && 'border-b border-gray-700/50'
                )}
              >
                <div className="font-medium text-gray-200">{option.label}</div>
                {option.description && (
                  <div className="text-sm text-gray-400">{option.description}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {isOpen && searchTerm && filteredOptions.length === 0 && (
          <div className="absolute z-50 w-full mt-1 p-3 bg-gray-800 rounded-lg border border-gray-700 text-gray-400 text-sm">
            No results found
          </div>
        )}
      </div>
    </div>
  );
});

SearchResultList.displayName = 'SearchResultList';

export default SearchResultList; 
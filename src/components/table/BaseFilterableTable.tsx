import React from 'react';
import { Table, type Column } from '@/components/table/Table';
import { Button } from '@/components/ui';
import { useUpdateAnimation } from '@/hooks/useUpdateAnimation';
import { FormElement } from '@/components/formelement';
import { FaFilter } from 'react-icons/fa';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface BaseFilterableTableProps<T> {
  // Core table props
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  error?: any;
  onRowClick?: (item: T) => void;
  rowClassName?: (item: T) => string;
  
  // Filter configuration
  filters: FilterConfig[];
  selectedFilters: Record<string, string[]>;
  onFilterChange: (key: string, values: string[]) => void;
  
  // Search configuration
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  
  // Sort configuration
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  
  // Pagination configuration
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };

  updatedId?: string | number | null;
  isModalOpen?: boolean;
  
  fixedHeight?: string;
  navigationLocation?: 'top' | 'bottom';
  updateAgeColumn?: string;
}

export const BaseFilterableTable = <T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  isLoading,
  error,
  onRowClick,
  rowClassName,
  filters,
  selectedFilters,
  onFilterChange,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  sortBy,
  sortDirection,
  onSort,
  pagination,
  updatedId,
  fixedHeight,
  isModalOpen = false,
  navigationLocation,
  updateAgeColumn
}: BaseFilterableTableProps<T>) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false);
  const [localSearchTerm, setLocalSearchTerm] = React.useState(searchTerm);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const { className: animationClass } = useUpdateAnimation(updatedId || '');

  // Focus input when search is cleared
  React.useEffect(() => {
    if (localSearchTerm === '' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [localSearchTerm]);

  // Debounced search handler
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (onSearchChange) {
        onSearchChange(localSearchTerm);
      }
    }, 300); // 300ms debounce delay

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearchTerm, onSearchChange]);

  // Sync local search term with prop
  React.useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  // Calculate if we have any recent updates (< 1 hour)
  const recentUpdatesCount = React.useMemo(() => {
    if (!updateAgeColumn || !data.length) return 0;
    const secondsInHour = 60 * 60;
    
    return data.filter(item => {
      const secondsAgo = item[updateAgeColumn.replace('_at', '_secondsago')];
      if (secondsAgo === undefined) {
        return false;
      }
      
      const isRecent = secondsAgo <= secondsInHour;
            
      return isRecent;
    }).length;
  }, [data, updateAgeColumn]);

  // Add the recent updates filter if we have the age column
  const allFilters = React.useMemo(() => {
    if (!updateAgeColumn) return filters;

    // Count items updated in last hour
    const secondsAgoField = `${updateAgeColumn.replace('_at', '')}_secondsago`;
    const count = data.filter(item => {
      const secondsAgo = item[secondsAgoField];
      return typeof secondsAgo === 'number' && secondsAgo <= 3600;
    }).length;

    const recentFilter: FilterConfig = {
      key: 'recent_updates',
      label: 'Recent Updates',
      options: [
        { 
          value: 'recent', 
          label: 'Last Hour', 
          count
        }
      ]
    };

    return [...filters, recentFilter];
  }, [filters, updateAgeColumn, data, keyExtractor]);

  // Filter out any filters that only have one option
  const validFilters = React.useMemo(() => {
    return allFilters.filter(filter => filter.options.length > 1);
  }, [allFilters]);

  // Adjust pagination based on the data from useTableState
  const adjustedPagination = React.useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
    
    // Ensure current page is valid for the current page size
    let currentPage = pagination.currentPage;
    const maxPage = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
    if (currentPage > maxPage) {
      currentPage = maxPage;
    }

    // Calculate valid start and end indices
    const startIndex = (currentPage - 1) * pagination.pageSize;
    const endIndex = Math.min(startIndex + pagination.pageSize, totalItems);

    return {
      ...pagination,
      totalItems,
      totalPages,
      currentPage,
      onPageChange: (page: number) => {
        if (!isModalOpen) {
          // Ensure the requested page is valid
          const validPage = Math.min(Math.max(1, page), maxPage);
          pagination.onPageChange(validPage);
        }
      },
      onPageSizeChange: (newSize: number) => {
        if (!isModalOpen) {
          // When changing page size, adjust current page to maintain approximate scroll position
          const currentTopItem = (currentPage - 1) * pagination.pageSize;
          const newPage = Math.floor(currentTopItem / newSize) + 1;
          pagination.onPageSizeChange(newSize);
          pagination.onPageChange(Math.min(newPage, Math.ceil(totalItems / newSize)));
        }
      }
    };
  }, [data, pagination, isModalOpen]);

  // Calculate the current page's data
  const currentPageData = React.useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      //console.log('[BaseFilterableTable] Recalculating currentPageData');
      //console.log('[BaseFilterableTable] sortBy:', sortBy);
      //console.log('[BaseFilterableTable] sortDirection:', sortDirection);
    }
    
    // First sort the data
    const sortedData = [...data].sort((a, b) => {
      // Get the values to compare
      let valA, valB;
      
      // Handle special case for _secondsago fields
      if (sortBy.endsWith('_secondsago')) {
        valA = Number(a[sortBy] ?? 0);
        valB = Number(b[sortBy] ?? 0);
      }
      // For nested properties like 'prices.complete.nok_fixed'
      else if (sortBy.includes('.')) {
        const parts = sortBy.split('.');
        valA = parts.reduce((obj, key) => obj?.[key], a);
        valB = parts.reduce((obj, key) => obj?.[key], b);
      } 
      // Regular properties
      else {
        valA = a[sortBy];
        valB = b[sortBy];
      }
      
      // Handle undefined/null values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      
      // Handle numeric sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      // String comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      
      return sortDirection === 'asc' 
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
    
    // Then paginate
    const startIndex = (adjustedPagination.currentPage - 1) * adjustedPagination.pageSize;
    const endIndex = Math.min(startIndex + adjustedPagination.pageSize, sortedData.length);
    return sortedData.slice(startIndex, endIndex);
  }, [data, sortBy, sortDirection, adjustedPagination.currentPage, adjustedPagination.pageSize]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        {/* Left side: Search */}
        {onSearchChange && (
          <div className="w-1/6 relative">
            <input
              ref={searchInputRef}
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setLocalSearchTerm('');
                  if (onSearchChange) onSearchChange('');
                }
              }}
              className="w-full p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-gray-300 pr-8"
              placeholder={searchPlaceholder}
            />
            {localSearchTerm && (
              <button
                onClick={() => {
                  setLocalSearchTerm('');
                  if (onSearchChange) onSearchChange('');
                }}
                type="button"
                title="Clear search"
                className="absolute bg-transparent border-none right-[-5px] top-[-1px] text-red-600 hover:text-red-400 transition-colors"
              >X
              </button>
            )}
          </div>
        )}

        {/* Right side: Filters */}
        <div className={onSearchChange ? "w-5/6" : "w-full"}>
          {validFilters.length > 0 && (
            <>
              <button
                onClick={() => {
                  setIsFiltersExpanded(!isFiltersExpanded);
                  if (isFiltersExpanded) {
                    // Reset all filters when hiding
                    validFilters.forEach(filter => onFilterChange(filter.key, []));
                    if (onSearchChange) onSearchChange('');
                  }
                }}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-0 bg-gray-900 border border-gray-700 rounded-lg p-2 hover:border-gray-700 w-[70px]"
              >
                <span>{isFiltersExpanded ? 'Filters' : 'Filters'}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isFiltersExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                className={`transition-all duration-200 ease-in-out overflow-hidden ${
                  isFiltersExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="flex gap-4">
                  {validFilters.map((filter) => (
                    <div key={filter.key} className="flex-1">
                      <FormElement
                        elementType="listmultiple"
                        label={filter.label}
                        labelIcon={<FaFilter />}
                        labelIconColor="text-gray-400"
                        labelPosition="above"
                        options={filter.options}
                        selectedOptions={selectedFilters[filter.key] || []}
                        onValueChange={(values) => onFilterChange(filter.key, Array.isArray(values) ? values.map(String) : [])}
                        placeholder={`Select ${filter.label}...`}
                        className="w-full"
                        showResetPill={true}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        data={currentPageData}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        error={error}
        onSort={onSort}
        onRowClick={onRowClick}
        sortBy={sortBy}
        sortDirection={sortDirection}
        pagination={adjustedPagination}
        updatedId={updatedId}
        isModalOpen={isModalOpen}
        fixedHeight={fixedHeight}
        navigationLocation={navigationLocation}
        rowClassName={rowClassName}
        updateAgeColumn={updateAgeColumn}
      />
    </div>
  );
}; 
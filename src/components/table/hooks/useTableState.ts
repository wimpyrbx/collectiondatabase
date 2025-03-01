import React from 'react';
import type { FilterConfig } from '../BaseFilterableTable';

export interface TableStateConfig<T> {
  initialSort: string;
  initialPageSize?: number;
  data: T[];
  getFilterConfigs: (data: T[]) => FilterConfig[];
}

export function useTableState<T extends Record<string, any>>({
  initialSort,
  initialPageSize = 10,
  data,
  getFilterConfigs
}: TableStateConfig<T>) {
  // Table state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<string>(initialSort);
  const [sortDirection, setSortDirection] = React.useState<'asc'|'desc'>('asc');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [selectedFilters, setSelectedFilters] = React.useState<Record<string, string[]>>({});
  const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false);

  // Handle page size changes
  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    const currentStartIndex = (page - 1) * pageSize;
    const newPage = Math.floor(currentStartIndex / newPageSize) + 1;
    setPage(newPage);
    setPageSize(newPageSize);
  }, [page, pageSize]);

  // Create memoized filter functions
  const searchFilter = React.useCallback((item: T) => {
    if (!searchTerm) return true;

    // Split search term into individual words and filter out empty strings
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
    
    // Fields to search through
    const searchFields = [
      'product_title',
      'product_variant',
      'product_type_name',
      'release_year',
      'region_name',
      'rating_name'
    ];

    // Get all searchable text from the item
    const itemText = searchFields
      .map(field => {
        const value = item[field];
        // Handle null, undefined, and empty strings consistently
        if (value === null || value === undefined || value === '') {
          return '';
        }
        return String(value).toLowerCase();
      })
      .filter(Boolean)  // Remove empty strings before joining
      .join(' ');

    // All search terms must be found somewhere in the item's text
    return searchTerms.every(term => itemText.includes(term));
  }, [searchTerm]);

  const customFilter = React.useCallback((item: T) => {
    return Object.entries(selectedFilters).every(([key, values]) => {
      if (!values || values.length === 0) return true;

      // Handle recent updates filter
      if (key === 'recent_updates') {
        const secondsAgo = (item as any).products_updated_secondsago;
        if (values.includes('recent')) {
          return typeof secondsAgo === 'number' && secondsAgo <= 3600;
        }
        return true;
      }

      // Handle tag filters
      if (key.startsWith('tag_')) {
        const tagName = key.replace('tag_', '');
        const tags = (item as any).tags || [];
        return values.every(filterValue => {
          const [tagName, tagValue] = filterValue.split('=');
          if (tagValue) {
            return tags.includes(`${tagName}=${tagValue}`);
          } else {
            return tags.includes(tagName);
          }
        });
      }

      // Handle regular filters
      const itemValue = item[key];
      // Handle empty values specially
      if (values.includes('')) {
        return itemValue === null || itemValue === undefined || String(itemValue).trim() === '';
      }
      // Handle null/undefined values in comparison
      if (itemValue === null || itemValue === undefined) {
        return false;
      }
      return values.includes(String(itemValue));
    });
  }, [selectedFilters]);

  // Filter data with memoized functions
  const filtered = React.useMemo(() => {
    return data.filter(item => searchFilter(item) && customFilter(item));
  }, [data, searchFilter, customFilter]);

  // Get filter configurations with dynamic counts based on currently filtered data
  const filterConfigs = React.useMemo(() => {
    const baseConfigs = getFilterConfigs(data);
    
    // Create a Map for faster lookups of filtered items
    const filteredSet = new Set(filtered.map(item => JSON.stringify(item)));
    
    return baseConfigs.map(config => {
      const optionCounts = new Map<string, number>();
      
      // Pre-calculate counts for all options
      filtered.forEach(item => {
        const value = String(item[config.key] || '');
        optionCounts.set(value, (optionCounts.get(value) || 0) + 1);
      });
      
      const options = config.options.map(option => ({
        ...option,
        count: optionCounts.get(option.value) || 0
      }));

      return {
        ...config,
        options
      };
    });
  }, [data, filtered, getFilterConfigs]);

  // Sort data with stable sort
  const sorted = React.useMemo(() => {
    const indexMap = new Map(filtered.map((item, index) => [item, index]));
    
    return [...filtered].sort((a, b) => {
      // Handle special case for _secondsago fields
      if (sortBy.endsWith('_secondsago')) {
        const valA = Number(a[sortBy] ?? 0);
        const valB = Number(b[sortBy] ?? 0);
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      
      // For nested properties like 'prices.complete.nok_fixed'
      let valA, valB;
      
      if (sortBy.includes('.')) {
        const parts = sortBy.split('.');
        valA = parts.reduce((obj, key) => obj?.[key], a);
        valB = parts.reduce((obj, key) => obj?.[key], b);
      } else {
        valA = a[sortBy];
        valB = b[sortBy];
      }
      
      // Handle undefined/null values
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
      
      // If values are equal, maintain original order
      if (valA === valB) {
        return (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0);
      }

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
  }, [filtered, sortBy, sortDirection]);

  // Calculate pagination
  const startIndex = (page - 1) * pageSize;
  const currentPageData = sorted.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  // Handle filter changes
  const handleFilterChange = React.useCallback((key: string, values: string[]) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: values
    }));
    setPage(1); // Reset to first page when filters change
  }, []);

  // Handle search changes
  const handleSearchChange = React.useCallback((term: string) => {
    setSearchTerm(term);
    setPage(1); // Reset to first page when search changes
  }, []);

  // Handle sort
  const handleSort = React.useCallback((column: string) => {
    if (process.env.NODE_ENV === 'development') {
      //console.log('[useTableState] Sorting by column:', column);
      //console.log('[useTableState] Current sortBy:', sortBy);
      //console.log('[useTableState] Current sortDirection:', sortDirection);
    }
    
    if (column === sortBy) {
      setSortDirection(prevDirection => {
        const newDirection = prevDirection === 'asc' ? 'desc' : 'asc';
        if (process.env.NODE_ENV === 'development') {
          //console.log('[useTableState] Changing direction to:', newDirection);
        }
        return newDirection;
      });
    } else {
      if (process.env.NODE_ENV === 'development') {
        //console.log('[useTableState] Setting new sortBy:', column);
      }
      setSortBy(column);
      setSortDirection('asc');
    }
  }, [sortBy]);

  // Add a useEffect to log when sortBy or sortDirection changes
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      //console.log('[useTableState] Sort state changed - sortBy:', sortBy, 'sortDirection:', sortDirection);
    }
  }, [sortBy, sortDirection]);

  return {
    // Data
    currentPageData,
    filteredAndSortedData: sorted,
    
    // Filter state
    filters: filterConfigs,
    selectedFilters,
    onFilterChange: handleFilterChange,
    
    // Search state
    searchTerm,
    onSearchChange: handleSearchChange,
    
    // Sort state
    sortBy,
    sortDirection,
    onSort: handleSort,
    
    // Pagination state
    pagination: {
      currentPage: page,
      pageSize,
      totalPages,
      totalItems: sorted.length,
      onPageChange: setPage,
      onPageSizeChange: handlePageSizeChange
    }
  };
} 
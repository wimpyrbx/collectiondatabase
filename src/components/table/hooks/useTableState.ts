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

  // Filter data
  const filtered = React.useMemo(() => {
    return data.filter((item: T) => {
      // Search term filter
      const matchesSearch = !searchTerm || Object.values(item).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Custom filters - exclude current filter when calculating available options
      const matchesFilters = Object.entries(selectedFilters).every(([key, values]) => {
        if (!values || values.length === 0) return true;

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
          return !itemValue || String(itemValue).trim() === '';
        }
        return values.includes(itemValue);
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, selectedFilters]);

  // Get filter configurations with dynamic counts based on currently filtered data
  const filterConfigs = React.useMemo(() => {
    const baseConfigs = getFilterConfigs(data);
    
    return baseConfigs.map(config => {
      // For each filter option, calculate count based on items that would match if this option was selected
      const options = config.options.map(option => {
        // Create a temporary filter state excluding the current filter
        const otherFilters = { ...selectedFilters };
        delete otherFilters[config.key];

        // Count items that match other filters and would match this option
        const count = data.filter(item => {
          // Check if item matches search
          const matchesSearch = !searchTerm || Object.values(item).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          );

          // Check if item matches other filters
          const matchesOtherFilters = Object.entries(otherFilters).every(([key, values]) => {
            if (!values || values.length === 0) return true;
            
            // Handle tag filters in other filters
            if (key.startsWith('tag_')) {
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

            const itemValue = item[key];
            // Handle empty values specially
            if (values.includes('')) {
              return !itemValue || String(itemValue).trim() === '';
            }
            return values.includes(itemValue);
          });

          // Check if item matches this option
          let matchesThisOption = false;
          if (config.key.startsWith('tag_')) {
            const tags = (item as any).tags || [];
            const tagName = config.key.replace('tag_', '');
            const [_, tagValue] = option.value.split('=');

            if (option.value === '') {
              // For empty option (None), count items that don't have the tag at all
              matchesThisOption = !tags.some((t: string) => t.startsWith(tagName));
            } else {
              // For all tags (boolean, set, text), just check for exact match
              matchesThisOption = tags.includes(option.value);
            }
          } else {
            matchesThisOption = option.value === '' 
              ? !item[config.key] || String(item[config.key]).trim() === ''
              : item[config.key] === option.value;
          }

          return matchesSearch && matchesOtherFilters && matchesThisOption;
        }).length;

        return {
          ...option,
          count
        };
      });

      return {
        ...config,
        options
      };
    });
  }, [data, selectedFilters, searchTerm, getFilterConfigs]);

  // Sort data
  const sorted = React.useMemo(() => {
    // Create a map of original indices to maintain order during animations
    const indexMap = new Map(data.map((item, index) => [item[sortBy], index]));
    
    return [...filtered].sort((a, b) => {
      let valA = a[sortBy] ?? '';
      let valB = b[sortBy] ?? '';
      
      // If values are equal, maintain original order
      if (valA === valB) {
        const indexA = indexMap.get(valA) ?? 0;
        const indexB = indexMap.get(valB) ?? 0;
        return indexA - indexB;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortBy, sortDirection, data]);

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
    if (column === sortBy) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  }, [sortBy]);

  return {
    // Data
    currentPageData,
    
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
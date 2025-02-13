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
  navigationLocation
}: BaseFilterableTableProps<T>) => {
  const [isFiltersExpanded, setIsFiltersExpanded] = React.useState(false);
  const { className: animationClass } = useUpdateAnimation(updatedId || '');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        {/* Left side: Search */}
        {onSearchChange && (
          <div className="w-1/4">
            <input
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full p-2 text-sm border border-gray-700 rounded-lg bg-gray-900 text-gray-300"
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* Right side: Filters */}
        <div className={onSearchChange ? "w-3/4" : "w-full"}>
          <button
            onClick={() => {
              setIsFiltersExpanded(!isFiltersExpanded);
              if (isFiltersExpanded) {
                // Reset all filters when hiding
                filters.forEach(filter => onFilterChange(filter.key, []));
                if (onSearchChange) onSearchChange('');
              }
            }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 mb-0 bg-gray-900 border border-gray-700 rounded-lg p-2 hover:border-gray-700 w-[100px]"
          >
            <span>{isFiltersExpanded ? 'Hide Filters' : 'Show Filters'}</span>
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
              {filters.map((filter) => (
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
        </div>
      </div>

      <Table
        columns={columns}
        data={data}
        keyExtractor={keyExtractor}
        isLoading={isLoading}
        error={error}
        onSort={onSort}
        onRowClick={onRowClick}
        sortBy={sortBy}
        sortDirection={sortDirection}
        pagination={{
          ...pagination,
          onPageChange: (page) => {
            if (!isModalOpen) {
              pagination.onPageChange(page);
            }
          },
          onPageSizeChange: (size) => {
            if (!isModalOpen) {
              pagination.onPageSizeChange(size);
            }
          }
        }}
        updatedId={updatedId}
        isModalOpen={isModalOpen}
        fixedHeight={fixedHeight}
        navigationLocation={navigationLocation}
        rowClassName={rowClassName}
      />
    </div>
  );
}; 
import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import clsx from 'clsx';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { TableProps } from './types';
import { TooltipProps } from '@/utils/tooltip';

export interface Column<T> {
  key: string;
  header: string;
  tooltip?: TooltipProps;
  width?: string;
  sortKey?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  rowClassName?: string;
  accessor: (row: T) => React.ReactNode;
}

interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Table<T>({ 
  columns, 
  data, 
  footerData,
  keyExtractor,
  isLoading,
  error,
  onSort,
  onRowClick,
  rowClassName,
  pagination,
  sortBy,
  sortDirection
}: TableProps<T>) {
  // Track previous data for comparison
  const prevDataRef = React.useRef<Map<string, any>>(new Map());
  const [changedRows, setChangedRows] = React.useState<Set<string>>(new Set());
  const isFirstRender = React.useRef(true);
  
  // Update tooltip state to include mouse position
  const [tooltipState, setTooltipState] = React.useState<{
    columnKey: string | null;
    visible: boolean;
    elementRef: React.RefObject<HTMLDivElement> | null;
  }>({
    columnKey: null,
    visible: false,
    elementRef: null
  });
  
  const tableRef = React.useRef<HTMLDivElement>(null);
  const headerRefs = React.useRef<Map<string, HTMLTableCellElement>>(new Map());

  const getRelativeMousePosition = (e: React.MouseEvent) => {
    if (tableRef.current) {
      const rect = tableRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  // Detect changes and update changedRows
  React.useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevDataRef.current = new Map(data.map(item => [keyExtractor(item), item]));
      return;
    }

    const newChangedRows = new Set<string>();
    
    // Compare each row's data with its previous state
    data.forEach(item => {
      const key = keyExtractor(item);
      const prevItem = prevDataRef.current.get(key);
      
      if (prevItem) {
        // Deep compare the items
        const currentStr = JSON.stringify(item);
        const prevStr = JSON.stringify(prevItem);
        
        if (currentStr !== prevStr) {
          newChangedRows.add(key);
        }
      }
    });

    if (newChangedRows.size > 0) {
      setChangedRows(newChangedRows);
      // Remove highlights after animation
      newChangedRows.forEach(key => {
        setTimeout(() => {
          setChangedRows(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }, 1000);
      });
    }
    
    // Update previous data reference
    prevDataRef.current = new Map(data.map(item => [keyExtractor(item), item]));
  }, [data, keyExtractor]);

  const handleRowClick = React.useCallback((e: React.MouseEvent, item: T) => {
    // Prevent row click when clicking on buttons or interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onRowClick?.(item);
  }, [onRowClick]);

  // Handle keyboard navigation for pagination
  React.useEffect(() => {
    if (!pagination) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if we're in an input element, select, or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (pagination.currentPage > 1) {
            pagination.onPageChange(pagination.currentPage - 1);
          }
          break;
        case 'ArrowRight':
          if (pagination.currentPage < pagination.totalPages) {
            pagination.onPageChange(pagination.currentPage + 1);
          }
          break;
        case 'Home':
          if (pagination.currentPage !== 1) {
            pagination.onPageChange(1);
          }
          break;
        case 'End':
          if (pagination.currentPage !== pagination.totalPages) {
            pagination.onPageChange(pagination.totalPages);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pagination]);

  if (isLoading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  const renderPagination = () => {
    if (!pagination) return null;

    const { currentPage, pageSize, totalPages, totalItems, onPageChange, onPageSizeChange } = pagination;

    return (
      <div className="flex items-center justify-between py-3 bg-gray-800">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded focus:ring-blue-500 focus:border-blue-500 p-1 text-center
              [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [appearance:none] [&::-ms-expand]:hidden !overflow-auto bg-[length:0] !bg-none"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-400">
            entries
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {totalItems > 0 
              ? `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalItems)} of ${totalItems}`
              : 'No entries'
            }
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            <span className="text-sm text-gray-400 pl-2 pr-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={tableRef} className="bg-gray-800 rounded-lg shadow overflow-hidden">
      {tooltipState.visible && tooltipState.columnKey && (
        <Tooltip
          {...columns.find(col => col.key === tooltipState.columnKey)?.tooltip}
          text={columns.find(col => col.key === tooltipState.columnKey)?.tooltip?.text || ''}
          isOpen={tooltipState.visible}
          elementRef={{ current: headerRefs.current.get(tooltipState.columnKey) || null }}
        />
      )}
      {renderPagination()}
      <div className="overflow-x-auto border-l border-r border-b border-gray-900 overflow-x-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900">
            <tr>
              {columns.map((column) => {
                const isColumnSorted = column.sortKey === sortBy || column.key === sortBy;
                return (
                  <th
                    key={column.key}
                    ref={(el) => {
                      if (el) headerRefs.current.set(column.key, el);
                    }}
                    className={clsx(
                      'px-3 py-2 text-left text-xs font-medium uppercase whitespace-nowrap border-b-2 border-t-2 border-gray-900',
                      column.sortable && 'cursor-pointer hover:text-gray-100',
                      !column.sortable && 'cursor-default',
                      isColumnSorted ? 'text-gray-100' : 'text-gray-400',
                      column.headerClassName,
                      isColumnSorted && sortDirection === 'asc' ? '!border-t-blue-900' : '',
                      isColumnSorted && sortDirection === 'desc' ? '!border-b-blue-900' : '',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && onSort?.(column.sortKey || column.key)}
                    onMouseEnter={() => {
                      if (column.tooltip) {
                        setTooltipState({
                          columnKey: column.key,
                          visible: true,
                          elementRef: React.createRef<HTMLDivElement>()
                        });
                      }
                    }}
                    onMouseLeave={() => {
                      setTooltipState({
                        columnKey: null,
                        visible: false,
                        elementRef: null
                      });
                    }}
                  >
                    {column.header}
                    {column.sortable && (
                      <span className="ml-2 inline-block">
                        {isColumnSorted && (
                          sortDirection === 'asc' ? (
                            <FiChevronUp className='w-3 h-3 text-gray-100' />
                          ) : (
                            <FiChevronDown className='w-3 h-3 text-gray-100' />
                          )
                        )} 
                        {!isColumnSorted && (
                          <FiChevronUp className='w-3 h-3 text-gray-500' />
                        )}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700 bg-gray-900/40">
            {data.map((item) => {
              const rowKey = keyExtractor(item);
              const isChanged = changedRows.has(rowKey);
              
              return (
                <tr 
                  key={rowKey}
                  onClick={(e) => handleRowClick(e, item)}
                  className={clsx(
                    'transition-all duration-0',
                    'hover:bg-gray-900/50',
                    isChanged && 'animate-fadeOut',
                    rowClassName
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-3 py-2 whitespace-nowrap text-sm text-gray-300',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.rowClassName
                      )}
                    >
                      {column.accessor(item)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {footerData && (
            <tfoot className="bg-gray-900">
              <tr>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={clsx(
                      'px-3 py-2 text-sm font-medium text-gray-400',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right'
                    )}
                  >
                    {column.accessor(footerData[0])}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
} 
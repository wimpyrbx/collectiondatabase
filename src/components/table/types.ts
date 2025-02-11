import { ReactNode } from 'react';
import { TooltipProps } from '@/utils/tooltip';

export interface TableColumn<T> {
  key: string;
  header: string;
  icon?: ReactNode;
  accessor: (item: T) => ReactNode;
  sortKey?: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  rowClassName?: string;
  tooltip?: TooltipProps;
}

export interface TablePagination {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  footerData?: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  error?: Error | null;
  onSort?: (key: string) => void;
  onRowClick?: (item: T) => void;
  rowClassName?: string;
  pagination?: TablePagination;
  paginationPosition?: 'top' | 'bottom';
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  updatedId?: string | number | null;
  isModalOpen?: boolean;
} 
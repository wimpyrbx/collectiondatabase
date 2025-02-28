import { InventoryViewItem } from './inventory';

export interface SaleItem {
  id: number;
  sale_id: number;
  inventory_id: number;
  price: number | null;
  created_at: string;
  updated_at: string;
}

export interface SaleViewItem {
  sale_id: number;
  buyer_name: string | null;
  sale_status: string;
  sale_notes: string | null;
  created_at: string;
  updated_at: string;
  number_of_items: number;
  total_sold_price: number;
  items?: SaleItemWithInventory[];
}

export interface SaleItemWithInventory extends SaleItem {
  inventory?: InventoryViewItem;
}

export interface SaleWithItems extends SaleViewItem {
  items: SaleItemWithInventory[];
}

export const SALE_STATUSES = {
  Reserved: 'Reserved',
  Completed: 'Completed',
  Cancelled: 'Cancelled'
};

export interface SaleItemViewItem {
  sale_item_id: number;
  sale_id: number;
  inventory_id: number;
  sold_price: number;
  product_title: string;
  product_variant: string | null;
  product_group_name: string;
  product_type_name: string;
  rating_name: string | null;
  region_name: string | null;
} 
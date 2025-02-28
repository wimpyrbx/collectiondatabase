import { InventoryViewItem } from './inventory';

export interface PurchaseItem {
  purchase_id: number;
  seller_name: string | null;
  origin: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  purchase_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseViewItem extends PurchaseItem {
  number_of_items: number;
  total_cost: number;
  items?: InventoryViewItem[];
}

export interface PurchaseWithItems extends PurchaseViewItem {
  items: InventoryViewItem[];
} 
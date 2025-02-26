import { InventoryViewItem } from '@/types/inventory';
import { TagWithRelationships } from '@/types/tags';

export type PurchaseItem = {
  purchase_id: number;
  seller: string;
  origin: string;
  purchase_date: string;
  item_count: number;
};

export interface InventoryFormData {
  inventory_id?: number;
  inventory_status: string;
  sale_id?: number | null;
  sale_status?: string | null;
  sale_buyer?: string | null;
  sale_date?: string | null;
  sale_notes?: string | null;
  sold_price?: number | null;
  purchase_id?: number | null;
  purchase_seller?: string | null;
  purchase_origin?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  override_price?: number | null;
  [key: string]: any; // Allow for additional form fields
} 
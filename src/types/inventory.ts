// src/types/inventory.ts
import type { ProductPrices } from './product';
import type { TagInfo } from './tags';

export interface Inventory {
  id: number;
  product_id: number;
  purchase_id: number | null;
  sale_id: number | null;
  override_price: number | null;
  created_at: string;
  inventory_status: string;
  inventory_updated_at: string;
}

export type NewInventory = Omit<Inventory, 'id' | 'created_at' | 'inventory_updated_at'>;

export type UpdateInventory = Partial<NewInventory>;

export interface InventoryWithDetails extends Inventory {
  purchase_seller: string | null;
  purchase_origin: string | null;
  purchase_cost: number | null;
  purchase_date: string | null;
  purchase_notes: string | null;
  sale_buyer: string | null;
  sale_status: string | null;
  sale_date: string | null;
  sale_notes: string | null;
  sold_price: number | null;
  barcodes?: string[];
}

// This represents the data from the view_inventory view
export interface InventoryViewItem {
    inventory_id: number;
    product_id: number;
    purchase_id: number | null;
    sale_id: number | null;
    inventory_status: string;
    inventory_created_at: string;
    product_title: string;
    product_variant: string | null;
    release_year: number | null;
    is_product_active: boolean;
    product_notes: string | null;
    product_created_at: string;
    product_updated_at: string;
    product_group_name: string | null;
    product_type_name: string;
    rating_name: string | null;
    region_name: string | null;
    override_price: number | null;
    prices: ProductPrices | null;
    final_price: number | null;
    purchase_seller: string | null;
    purchase_origin: string | null;
    purchase_cost: number | null;
    purchase_date: string | null;
    purchase_notes: string | null;
    sale_buyer: string | null;
    sale_status: string | null;
    sale_date: string | null;
    sale_notes: string | null;
    sold_price: number | null;
    barcodes?: string[];
    tags: TagInfo[];
}
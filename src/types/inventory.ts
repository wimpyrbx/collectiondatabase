// src/types/inventory.ts
export interface InventoryViewItem {
    inventory_id: string;
    product_id: string;
    purchase_id: string;
    sale_id: string;
    inventory_status: string;
    inventory_created_at: string;
    product_title: string;
    product_variant: string;
    release_year: number;
    is_product_active: boolean;
    product_notes: string;
    product_created_at: string;
    product_updated_at: string;
    product_group_name: string;
    product_type_name: string;
    rating_name: string;
    region_name: string;
    override_price: number | null;
    price_nok_fixed: number;
    price_new_nok_fixed: number | null;
    final_price: number;
    purchase_seller: string;
    purchase_origin: string;
    purchase_cost: number;
    purchase_date: string;
    purchase_notes: string;
    sale_buyer: string;
    sale_status: string;
    sale_date: string;
    sale_notes: string;
    sold_price: number;
  }
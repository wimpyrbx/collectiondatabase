export interface Product {
  id: number;
  product_type: string;
  region: string | null;
  product_title: string;
  product_variant: string | null;
  release_year: number | null;
  price_usd: number | null;
  price_nok: number | null;
  price_nok_fixed: number | null;
  is_product_active: boolean;
  product_notes: string | null;
  created_at: string;
  updated_at: string;
  price_new_usd: number | null;
  price_new_nok: number | null;
  price_new_nok_fixed: number | null;
  rating: string | null;
  product_group: string | null;
  pricecharting_id: string | null;
}

export interface Sale {
  id: number;
  buyer_name: string | null;
  sale_total: number | null;
  sale_date: string | null;
  sale_notes: string | null;
  created_at: string;
  number_of_items: number;
  sale_status: string | null;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  inventory_id: number;
  sold_price: number;
}

// Types for creating new records (omit auto-generated fields)
export type NewProduct = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'price_nok' | 'price_nok_fixed' | 'price_new_nok' | 'price_new_nok_fixed'>;
export type NewSale = Omit<Sale, 'id' | 'created_at' | 'number_of_items' | 'sale_total'>;
export type NewSaleItem = Omit<SaleItem, 'id'>; 
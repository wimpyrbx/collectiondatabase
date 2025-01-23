export interface SaleViewItem {
  sale_id: number;
  buyer_name: string | null;
  sale_total: number | null;
  sale_date: string | null;
  sale_notes: string | null;
  created_at: string;
  number_of_items: number;
  sale_status: string | null;
  item_count: number;
  total_sold_price: number | null;
  product_titles: string[];
  product_variants: (string | null)[];
  product_groups: string[];
}

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
export interface ProductViewItem {
  product_id: string;
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
} 
import type { TagInfo } from './tags';

export type PriceType = 'loose' | 'new' | 'complete' | 'sealed';

export interface ProductPrice {
  product_id: number;
  price_type: PriceType;
  usd: number | null;
  nok: number | null;
  nok_fixed: number | null;
  updated_at: string;
}

export type ProductPrices = Record<PriceType, ProductPrice | undefined>;

export interface ProductViewItem {
  product_id: number;
  product_title: string;
  product_variant: string | null;
  release_year: number | null;
  is_product_active: boolean;
  product_notes: string | null;
  product_created_at: string;
  products_updated_at: string;
  products_updated_secondsago: number;
  product_group_name: string | null;
  product_type_name: string;
  rating_name: string | null;
  region_name: string | null;
  prices: ProductPrices | null;
  final_price: number | null;
  publisher: string | null;
  developer: string | null;
  genre: string | null;
  image_url: string | null;
  ean_gtin: string | null;
  asin: string | null;
  epid: string | null;
  pricecharting_id: string | null;
  tags: TagInfo[];
  normal_count: number;
  for_sale_count: number;
  collection_count: number;
  sold_count: number;
  total_count: number;
  total_sales: number;
  unique_buyers: number;
  avg_sale_price: number | null;
  max_sale_price: number | null;
  min_sale_price: number | null;
}

export interface ProductCreateDTO {
  product_title: string;
  product_variant?: string | null;
  release_year?: string | number | null;
  is_product_active?: boolean;
  product_notes?: string | null;
  product_group?: string | null;
  product_type: string;
  rating?: string | null;
  region?: string | null;
  publisher?: string | null;
  developer?: string | null;
  genre?: string | null;
  ean_gtin?: string | null;
  asin?: string | null;
  epid?: string | null;
  pricecharting_id?: string | null;
}

export interface ProductUpdateDTO extends Partial<ProductCreateDTO> {}

export interface ProductPriceCreateDTO {
  product_id: number;
  price_type: PriceType;
  price_usd: number;
}

export interface ProductPriceUpdateDTO extends Partial<Omit<ProductPriceCreateDTO, 'product_id' | 'price_type'>> {} 
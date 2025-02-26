import { CrudService, type ValidationResult, type CacheOperation } from './base/CrudService';
import type { Product } from '@/types/tables';
import type { ProductViewItem, ProductCreateDTO, ProductUpdateDTO, ProductPrices } from '@/types/product';
import { deleteImage } from '@/utils/imageUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateAndRefetch } from '@/utils/queryUtils';
import type { InventoryViewItem } from '@/types/inventory';

export class ProductService extends CrudService<Product, ProductCreateDTO, ProductUpdateDTO> {
  private readonly baseUrl = '/api/products';
  private isUpdating = false;

  constructor(
    supabaseClient: SupabaseClient,
    queryClient: QueryClient,
    tableName: string = 'products',
    cacheConfig = { queryKey: ['products'] }
  ) {
    super(supabaseClient, queryClient, tableName, cacheConfig);
  }

  protected validateCreate(data: ProductCreateDTO): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!data.product_title?.trim()) {
      errors.push('Product title is required');
    }

    if (!data.product_type?.trim()) {
      errors.push('Product type is required');
    }

    // Validate release year if provided
    if (data.release_year) {
      const year = Number(data.release_year);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        errors.push('Invalid release year');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected validateUpdate(data: ProductUpdateDTO): ValidationResult {
    const errors: string[] = [];

    // Only validate fields that are present
    if (data.product_title !== undefined && !data.product_title?.trim()) {
      errors.push('Product title cannot be empty');
    }

    if (data.product_type !== undefined && !data.product_type?.trim()) {
      errors.push('Product type cannot be empty');
    }

    if (data.release_year !== undefined && data.release_year !== null) {
      const year = Number(data.release_year);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        errors.push('Invalid release year');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected getCreateCacheOperations(data: ProductCreateDTO): CacheOperation<Product> {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: ProductViewItem[]) => {
            const optimisticProduct: ProductViewItem = {
              product_id: -1,
              product_title: data.product_title,
              product_variant: data.product_variant ?? null,
              release_year: data.release_year ? Number(data.release_year) : null,
              is_product_active: data.is_product_active ?? true,
              product_notes: data.product_notes ?? null,
              product_created_at: new Date().toISOString(),
              products_updated_at: new Date().toISOString(),
              products_updated_secondsago: 0,
              product_group_name: data.product_group ?? null,
              product_type_name: data.product_type,
              rating_name: data.rating ?? null,
              region_name: data.region ?? null,
              prices: null,
              final_price: null,
              publisher: data.publisher ?? null,
              developer: data.developer ?? null,
              genre: data.genre ?? null,
              image_url: null,
              ean_gtin: data.ean_gtin ?? null,
              asin: data.asin ?? null,
              epid: data.epid ?? null,
              pricecharting_id: data.pricecharting_id ?? null,
              normal_count: 0,
              for_sale_count: 0,
              collection_count: 0,
              sold_count: 0,
              total_count: 0,
              total_sales: 0,
              unique_buyers: 0,
              avg_sale_price: null,
              max_sale_price: null,
              min_sale_price: null
            };

            return [optimisticProduct, ...oldData];
          }
        }
      ]
    };
  }

  protected getUpdateCacheOperations(id: number, data: ProductUpdateDTO): CacheOperation<Product> {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: ProductViewItem[]) => {
            const updatedData = oldData.map(item => {
              if (item.product_id === id) {
                const updatedItem = {
                  ...item,
                  product_title: data.product_title !== undefined ? data.product_title : item.product_title,
                  product_variant: data.product_variant !== undefined ? data.product_variant : item.product_variant,
                  release_year: data.release_year !== undefined ? (data.release_year ? Number(data.release_year) : null) : item.release_year,
                  is_product_active: data.is_product_active !== undefined ? data.is_product_active : item.is_product_active,
                  product_notes: data.product_notes !== undefined ? data.product_notes : item.product_notes,
                  product_group_name: data.product_group !== undefined ? data.product_group : item.product_group_name,
                  product_type_name: data.product_type !== undefined ? data.product_type : item.product_type_name,
                  rating_name: data.rating !== undefined ? data.rating : item.rating_name,
                  region_name: data.region !== undefined ? data.region : item.region_name,
                  publisher: data.publisher !== undefined ? data.publisher : item.publisher,
                  developer: data.developer !== undefined ? data.developer : item.developer,
                  genre: data.genre !== undefined ? data.genre : item.genre,
                  ean_gtin: data.ean_gtin !== undefined ? data.ean_gtin : item.ean_gtin,
                  asin: data.asin !== undefined ? data.asin : item.asin,
                  epid: data.epid !== undefined ? data.epid : item.epid,
                  pricecharting_id: data.pricecharting_id !== undefined ? data.pricecharting_id : item.pricecharting_id
                };
                return updatedItem;
              }
              return item;
            });
            return updatedData;
          }
        }
      ],
      postUpdate: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: ProductViewItem[]) => {
            const updatedData = oldData.map(item => {
              if (item.product_id === id) {
                const updatedItem = {
                  ...item,
                  products_updated_at: new Date().toISOString(),
                  products_updated_secondsago: 0
                };
                return updatedItem;
              }
              return item;
            });
            return updatedData;
          }
        }
      ]
    };
  }

  private shouldUpdateInventory(data: ProductUpdateDTO): boolean {
    // Check if any fields that affect inventory are being updated
    return !!(
      data.product_title ||
      data.product_variant ||
      data.release_year ||
      data.product_group ||
      data.product_type ||
      data.rating ||
      data.region
    );
  }

  async refreshRelatedCaches(): Promise<void> {
    // Invalidate and refetch products with pagination support
    await invalidateAndRefetch<ProductViewItem>(
      this.queryClient,
      this.cacheConfig.queryKey,
      {
        tableName: 'view_products',
        orderBy: { column: 'product_title', ascending: true }
      }
    );

    // Invalidate and refetch inventory since it depends on products
    await invalidateAndRefetch<InventoryViewItem>(
      this.queryClient,
      ['inventory'],
      {
        tableName: 'view_inventory',
        orderBy: { column: 'inventory_created_at', ascending: false }
      }
    );
  }

  public async create(data: ProductCreateDTO): Promise<{ data: Product | null; errors: string[] }> {
    return super.create(data);
  }
} 
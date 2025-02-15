import { CrudService, type ValidationResult, type CacheOperation } from './base/CrudService';
import type { Product } from '@/types/tables';
import type { ProductViewItem } from '@/types/product';
import { deleteImage } from '@/utils/imageUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

// Base DTO without the release_year to avoid type conflicts
type BaseProductDTO = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'release_year'>;

export interface ProductCreateDTO extends BaseProductDTO {
  release_year?: string | number | null;
}

export interface ProductUpdateDTO extends Partial<ProductCreateDTO> {}

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
              product_group_name: data.product_group ?? null,
              product_type_name: data.product_type,
              rating_name: data.rating ?? null,
              region_name: data.region ?? null,
              price_usd: data.price_usd ?? null,
              price_nok: null,
              price_nok_fixed: null,
              price_new_usd: data.price_new_usd ?? null,
              price_new_nok: null,
              price_new_nok_fixed: null,
              final_price: null,
              normal_count: 0,
              for_sale_count: 0,
              collection_count: 0,
              sold_count: 0,
              total_count: 0,
              total_sales: 0,
              unique_buyers: 0,
              avg_sale_price: null,
              max_sale_price: null,
              min_sale_price: null,
              pricecharting_id: data.pricecharting_id ?? null
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
                  // Handle each field explicitly, allowing empty strings and null values
                  product_title: data.product_title !== undefined ? data.product_title : item.product_title,
                  product_variant: data.product_variant !== undefined ? data.product_variant : item.product_variant,
                  release_year: data.release_year !== undefined ? (data.release_year ? Number(data.release_year) : null) : item.release_year,
                  is_product_active: data.is_product_active !== undefined ? data.is_product_active : item.is_product_active,
                  product_notes: data.product_notes !== undefined ? data.product_notes : item.product_notes,
                  product_group_name: data.product_group !== undefined ? data.product_group : item.product_group_name,
                  product_type_name: data.product_type !== undefined ? data.product_type : item.product_type_name,
                  rating_name: data.rating !== undefined ? data.rating : item.rating_name,
                  region_name: data.region !== undefined ? data.region : item.region_name,
                  price_usd: data.price_usd !== undefined ? data.price_usd : item.price_usd,
                  price_new_usd: data.price_new_usd !== undefined ? data.price_new_usd : item.price_new_usd,
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
    // Invalidate inventory cache if it exists
    await this.queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  public async create(data: ProductCreateDTO): Promise<{ data: Product | null; errors: string[] }> {
    return super.create(data);
  }

  async deleteProduct(productId: number): Promise<void> {
    try {
      // Delete from database first
      const { error } = await this.supabaseClient
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      // If database deletion was successful, delete the image
      await deleteImage('product', productId);

      // Invalidate caches
      await this.queryClient.invalidateQueries({ queryKey: this.cacheConfig.queryKey });
    } catch (error) {
      throw error;
    }
  }
} 
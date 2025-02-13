import { CrudService, ValidationResult, CacheOperation } from './base/CrudService';
import type { Product } from '@/types/tables';
import type { ProductViewItem } from '@/types/product';
import axios from 'axios';

// Base DTO without the release_year to avoid type conflicts
type BaseProductDTO = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'release_year'>;

export interface ProductCreateDTO extends BaseProductDTO {
  release_year?: string | number | null;
}

export interface ProductUpdateDTO extends Partial<ProductCreateDTO> {}

export class ProductService extends CrudService<Product, ProductCreateDTO, ProductUpdateDTO> {
  private readonly baseUrl = '/api/products';
  private isUpdating = false;

  protected validateCreate(data: ProductCreateDTO): ValidationResult {
    const errors: string[] = [];
    
    // Required fields
    if (!data.product_title?.trim()) {
      errors.push('Product title is required');
    }

    // Release year validation
    if (data.release_year) {
      const year = Number(data.release_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1970 || year > currentYear) {
        errors.push(`Release year must be between 1970 and ${currentYear}`);
      }
    }

    // Region/Rating validation
    if (data.rating && !data.region) {
      errors.push('Region must be selected when a rating is specified');
    }

    // Rating system validation
    if (data.rating && data.region) {
      // Here you could add validation against available ratings for the region
      // This would typically involve checking against your regions data
    }

    // Product type validation
    if (!data.product_type) {
      errors.push('Product type is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected validateUpdate(data: ProductUpdateDTO): ValidationResult {
    const errors: string[] = [];
    
    // For updates, we only validate fields that are present
    if (data.product_title !== undefined && !data.product_title?.trim()) {
      errors.push('Product title is required');
    }

    if (data.release_year !== undefined && data.release_year !== null) {
      const year = Number(data.release_year);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1970 || year > currentYear) {
        errors.push(`Release year must be between 1970 and ${currentYear}`);
      }
    }

    if (data.rating && !data.region) {
      errors.push('Region must be selected when a rating is specified');
    }

    if (data.product_type === '') {
      errors.push('Product type cannot be empty if specified');
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
          queryKey: ['products'],
          update: (oldData: ProductViewItem[]) => {
            // Create an optimistic view item entry
            const optimisticProduct: ProductViewItem = {
              product_id: -1, // Temporary ID
              product_title: data.product_title,
              product_variant: data.product_variant || null,
              release_year: data.release_year ? Number(data.release_year) : null,
              is_product_active: data.is_product_active ?? true,
              product_notes: data.product_notes || null,
              product_created_at: new Date().toISOString(),
              product_updated_at: new Date().toISOString(),
              product_group_name: data.product_group || null,
              product_type_name: data.product_type,
              rating_name: data.rating || null,
              region_name: data.region || null,
              price_usd: data.price_usd || null,
              price_nok: null,
              price_nok_fixed: null,
              price_new_usd: data.price_new_usd || null,
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
              pricecharting_id: data.pricecharting_id || null
            };
            return [...oldData, optimisticProduct];
          },
          // Add rollback function
          rollback: (oldData: ProductViewItem[]) => {
            return oldData.filter(item => item.product_id !== -1);
          }
        }
      ]
    };
  }

  protected getUpdateCacheOperations(id: number, data: ProductUpdateDTO): CacheOperation<Product> {
    return {
      optimistic: [
        // Update products cache
        {
          queryKey: ['products'],
          update: (oldData: ProductViewItem[]) => {
            return oldData.map(product => 
              product.product_id === id 
                ? {
                    ...product,
                    product_title: data.product_title ?? product.product_title,
                    product_variant: data.product_variant ?? product.product_variant,
                    release_year: data.release_year ?? product.release_year,
                    product_notes: data.product_notes ?? product.product_notes,
                    product_group_name: data.product_group ?? product.product_group_name,
                    product_type_name: data.product_type ?? product.product_type_name,
                    rating_name: 'rating' in data ? data.rating : product.rating_name,
                    region_name: 'region' in data ? data.region : product.region_name,
                    product_updated_at: new Date().toISOString(),
                    pricecharting_id: 'pricecharting_id' in data ? data.pricecharting_id : product.pricecharting_id
                  }
                : product
            );
          }
        },
        // Update inventory cache if relevant fields changed
        ...(this.shouldUpdateInventory(data) ? [{
          queryKey: ['inventory'],
          update: (oldData: any[]) => {
            return oldData.map(item => 
              item.product_id === id
                ? {
                    ...item,
                    product_title: data.product_title ?? item.product_title,
                    product_variant: data.product_variant ?? item.product_variant,
                    product_type_name: data.product_type ?? item.product_type_name,
                    region_name: data.region ?? item.region_name,
                    rating_name: data.rating ?? item.rating_name
                  }
                : item
            );
          }
        }] : [])
      ]
    };
  }

  private shouldUpdateInventory(data: ProductUpdateDTO): boolean {
    // Check if any fields that affect inventory display are being updated
    return !!(
      data.product_title ||
      data.product_variant ||
      data.product_type ||
      data.region ||
      data.rating
    );
  }

  /**
   * Example of how to manually invalidate caches when needed
   */
  async refreshRelatedCaches(): Promise<void> {
    await this.invalidateCaches([
      ['products'],
      ['inventory']
    ]);
  }

  public async create(data: ProductCreateDTO): Promise<{ data: Product | null; errors: string[] }> {
    const validation = this.validateCreate(data);
    if (!validation.isValid) {
      return { data: null, errors: validation.errors };
    }

    const cacheOps = this.getCreateCacheOperations(data);
    const previousValues = new Map<string, any>();

    try {
      // Apply optimistic updates if any
      if (cacheOps.optimistic) {
        for (const update of cacheOps.optimistic) {
          const oldData = this.queryClient.getQueryData(update.queryKey);
          previousValues.set(JSON.stringify(update.queryKey), oldData);
          if (oldData) {
            this.queryClient.setQueryData(update.queryKey, update.update(oldData));
          }
        }
      }

      const { data: created, error } = await this.supabaseClient
        .from(this.tableName)
        .insert(data)
        .select('*')
        .single();

      if (error) throw error;

      // Update cache with the real product data
      this.queryClient.setQueryData<ProductViewItem[]>(['products'], old => {
        if (!old) return [];
        return old.map(item => {
          if (item.product_id === -1) {
            // Replace optimistic entry with real data
            return {
              ...item,
              product_id: created.id,
              product_created_at: created.created_at,
              product_updated_at: created.updated_at
            };
          }
          return item;
        });
      });

      return { data: created as Product, errors: [] };
    } catch (error) {
      // Rollback optimistic updates
      if (cacheOps.optimistic) {
        for (const update of cacheOps.optimistic) {
          const key = JSON.stringify(update.queryKey);
          const oldData = previousValues.get(key);
          if (oldData) {
            this.queryClient.setQueryData(
              update.queryKey,
              update.rollback ? update.rollback(oldData) : oldData
            );
          }
        }
      }
      return { data: null, errors: [this.handleError(error)] };
    }
  }

  async deleteProduct(productId: number): Promise<void> {
    this.isUpdating = true;
    try {
      await axios.delete(`${this.baseUrl}/${productId}`);
    } finally {
      this.isUpdating = false;
    }
  }
} 
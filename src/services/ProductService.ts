import { CrudService, ValidationResult, CacheOperation } from './base/CrudService';
import type { Product } from '@/types/tables';
import type { ProductViewItem } from '@/types/product';

// Base DTO without the release_year to avoid type conflicts
type BaseProductDTO = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'release_year'>;

export interface ProductCreateDTO extends BaseProductDTO {
  release_year?: string | number | null;
}

export interface ProductUpdateDTO extends Partial<ProductCreateDTO> {}

export class ProductService extends CrudService<Product, ProductCreateDTO, ProductUpdateDTO> {
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
          update: (oldData: Product[]) => {
            // Create an optimistic product entry
            const optimisticProduct: Product = {
              id: -1, // Temporary ID
              product_type: data.product_type,
              region: data.region || null,
              product_title: data.product_title,
              product_variant: data.product_variant || null,
              release_year: data.release_year ? Number(data.release_year) : null,
              price_usd: data.price_usd || null,
              price_nok: null,
              price_nok_fixed: null,
              is_product_active: data.is_product_active ?? true,
              product_notes: data.product_notes || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              price_new_usd: data.price_new_usd || null,
              price_new_nok: null,
              price_new_nok_fixed: null,
              rating: data.rating || null,
              product_group: data.product_group || null
            };
            return [...oldData, optimisticProduct];
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
                    rating_name: data.rating ?? product.rating_name,
                    region_name: data.region ?? product.region_name,
                    product_updated_at: new Date().toISOString()
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

  // Additional product-specific methods
  async updateWithTags(
    id: number, 
    data: ProductUpdateDTO,
    tagSelectorRef: React.RefObject<{ applyChanges: () => Promise<void>; hasChanges: () => boolean }>
  ): Promise<{ data: Product | null; errors: string[] }> {
    const result = await this.update(id, data);
    
    if (result.errors.length > 0) {
      return result;
    }

    try {
      // Apply tag changes if any
      if (tagSelectorRef.current?.hasChanges()) {
        await tagSelectorRef.current.applyChanges();
      }
      
      return result;
    } catch (error) {
      return {
        data: null,
        errors: [this.handleError(error)]
      };
    }
  }

  /**
   * Example of how to manually invalidate caches when needed
   */
  async refreshRelatedCaches(): Promise<void> {
    await this.invalidateCaches([
      ['products'],
      ['inventory'],
      ['product_tags']
    ]);
  }
} 
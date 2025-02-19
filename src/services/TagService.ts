import { CrudService, type ValidationResult } from './base/CrudService';
import type { BaseTag, NewTag, TagWithRelationships } from '@/types/tags';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

export abstract class TagService<T extends BaseTag> extends CrudService<T, NewTag, Partial<NewTag>> {
  constructor(
    supabaseClient: SupabaseClient,
    queryClient: QueryClient,
    tableName: string,
    cacheConfig = { queryKey: [tableName] }
  ) {
    super(supabaseClient, queryClient, tableName, cacheConfig);
  }

  protected validateCreate(data: NewTag): ValidationResult {
    const errors: string[] = [];

    if (!data.name) {
      errors.push('Name is required');
    }
    if (!data.display_type) {
      errors.push('Display type is required');
    }
    if (!data.display_value) {
      errors.push('Display value is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected validateUpdate(data: Partial<NewTag>): ValidationResult {
    const errors: string[] = [];

    if (data.name === '') {
      errors.push('Name cannot be empty');
    }
    if (data.display_type && !['icon', 'text', 'image'].includes(data.display_type)) {
      errors.push('Invalid display type');
    }
    if (data.display_value === '') {
      errors.push('Display value cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected getCreateCacheOperations(data: NewTag) {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: T[]) => {
            const optimisticTag = {
              id: -1,
              name: data.name,
              product_groups: data.product_groups || null,
              product_types: data.product_types || null,
              description: data.description || null,
              display_type: data.display_type,
              display_value: data.display_value,
              created_at: new Date().toISOString(),
              relationships_count: 0
            } as unknown as T;

            return [optimisticTag, ...oldData];
          }
        }
      ]
    };
  }

  protected getUpdateCacheOperations(id: number, data: Partial<NewTag>) {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: T[]) => {
            return oldData.map(item => {
              if (item.id === id) {
                return {
                  ...item,
                  ...data
                };
              }
              return item;
            });
          }
        }
      ]
    };
  }

  async getTagWithRelationships(id: number): Promise<TagWithRelationships | null> {
    const { data, error } = await this.supabaseClient
      .from(`view_${this.tableName}`)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async canDelete(id: number): Promise<{ canDelete: boolean; reason?: string }> {
    const tag = await this.getTagWithRelationships(id);
    if (!tag) {
      return { canDelete: false, reason: 'Tag not found' };
    }

    if (tag.relationships_count > 0) {
      return { 
        canDelete: false, 
        reason: `Cannot delete tag that is in use by ${tag.relationships_count} items` 
      };
    }

    return { canDelete: true };
  }

  async delete(id: number): Promise<void> {
    const { error } = await this.supabaseClient
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Invalidate queries
    this.queryClient.invalidateQueries({ queryKey: [this.tableName] });
  }
}

// Create specific services for product and inventory tags
export class ProductTagService extends TagService<BaseTag> {
  constructor(supabaseClient: SupabaseClient, queryClient: QueryClient) {
    super(supabaseClient, queryClient, 'product_tags', { queryKey: ['product_tags'] });
  }
}

export class InventoryTagService extends TagService<BaseTag> {
  constructor(supabaseClient: SupabaseClient, queryClient: QueryClient) {
    super(supabaseClient, queryClient, 'inventory_tags', { queryKey: ['inventory_tags'] });
  }
} 
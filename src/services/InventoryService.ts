import { CrudService, type ValidationResult, type CacheOperation } from './base/CrudService';
import type { Inventory, InventoryViewItem, NewInventory } from '@/types/inventory';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { invalidateAndRefetch } from '@/utils/queryUtils';

export class InventoryService extends CrudService<Inventory, NewInventory, Partial<NewInventory>> {
  constructor(
    supabaseClient: SupabaseClient,
    queryClient: QueryClient,
    tableName: string = 'inventory',
    cacheConfig = { queryKey: ['inventory'] }
  ) {
    super(supabaseClient, queryClient, tableName, cacheConfig);
  }

  protected validateCreate(data: NewInventory): ValidationResult {
    const errors: string[] = [];

    if (!data.product_id) {
      errors.push('Product ID is required');
    }

    if (!data.inventory_status) {
      errors.push('Inventory status is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected validateUpdate(data: Partial<NewInventory>): ValidationResult {
    const errors: string[] = [];

    if (data.product_id === null) {
      errors.push('Product ID cannot be null');
    }

    if (data.inventory_status === '') {
      errors.push('Inventory status cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected getCreateCacheOperations(data: NewInventory): CacheOperation<Inventory> {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: InventoryViewItem[]) => {
            const optimisticInventory: InventoryViewItem = {
              inventory_id: -1,
              product_id: data.product_id,
              purchase_id: data.purchase_id ?? null,
              sale_id: data.sale_id ?? null,
              inventory_status: data.inventory_status,
              inventory_created_at: new Date().toISOString(),
              product_title: '',
              product_variant: null,
              release_year: null,
              is_product_active: true,
              product_notes: null,
              product_created_at: new Date().toISOString(),
              product_updated_at: new Date().toISOString(),
              product_group_name: null,
              product_type_name: '',
              rating_name: null,
              region_name: null,
              override_price: data.override_price ?? null,
              prices: null,
              final_price: null,
              purchase_seller: data.purchase_seller ?? null,
              purchase_origin: data.purchase_origin ?? null,
              purchase_cost: data.purchase_cost ?? null,
              purchase_date: data.purchase_date ?? null,
              purchase_notes: data.purchase_notes ?? null,
              sale_buyer: data.sale_buyer ?? null,
              sale_status: data.sale_status ?? null,
              sale_date: data.sale_date ?? null,
              sale_notes: data.sale_notes ?? null,
              sold_price: data.sold_price ?? null
            };

            return [optimisticInventory, ...oldData];
          }
        }
      ]
    };
  }

  protected getUpdateCacheOperations(id: number, data: Partial<NewInventory>): CacheOperation<Inventory> {
    return {
      optimistic: [
        {
          queryKey: this.cacheConfig.queryKey,
          update: (oldData: InventoryViewItem[]) => {
            return oldData.map(item => {
              if (item.inventory_id === id) {
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

  async refreshRelatedCaches(): Promise<void> {
    // Invalidate and refetch inventory with pagination support
    await invalidateAndRefetch<InventoryViewItem>(
      this.queryClient,
      this.cacheConfig.queryKey,
      {
        tableName: 'view_inventory',
        orderBy: { column: 'inventory_created_at', ascending: false }
      }
    );
  }

  async addBarcode(inventoryId: number, barcode: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('inventory_barcodes')
      .insert({ inventory_id: inventoryId, barcode });

    if (error) throw error;
    await this.refreshRelatedCaches();
  }

  async removeBarcode(inventoryId: number, barcode: string): Promise<void> {
    const { error } = await this.supabaseClient
      .from('inventory_barcodes')
      .delete()
      .match({ inventory_id: inventoryId, barcode });

    if (error) throw error;
    await this.refreshRelatedCaches();
  }

  async getBarcodes(inventoryId: number): Promise<string[]> {
    const { data, error } = await this.supabaseClient
      .from('inventory_barcodes')
      .select('barcode')
      .eq('inventory_id', inventoryId);

    if (error) throw error;
    return data.map(row => row.barcode);
  }
} 
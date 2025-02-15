import { SupabaseClient } from '@supabase/supabase-js';
import { QueryClient, QueryKey } from '@tanstack/react-query';

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationConfig<T> {
  [key: string]: ValidationRule<T>[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface CacheConfig {
  queryKey: QueryKey;
}

export interface OptimisticUpdate<T> {
  /** The query key to update */
  queryKey: QueryKey;
  /** Function to update the cached data */
  update: (oldData: any) => any;
  /** Optional rollback function if the operation fails */
  rollback?: (oldData: any) => any;
}

export interface CacheOperation<T> {
  /** Optimistic updates to apply before operation completes */
  optimistic?: OptimisticUpdate<T>[];
  /** Updates to apply after operation completes successfully */
  postUpdate?: OptimisticUpdate<T>[];
}

export abstract class CrudService<T, CreateDTO = T, UpdateDTO = Partial<T>> {
  constructor(
    protected supabaseClient: SupabaseClient,
    protected queryClient: QueryClient,
    protected tableName: string,
    protected cacheConfig: CacheConfig
  ) {}

  protected abstract validateCreate(data: CreateDTO): ValidationResult;
  protected abstract validateUpdate(data: UpdateDTO): ValidationResult;

  protected handleError(error: any): string {
    if (error instanceof Error) {
      // Handle specific database constraints or known errors
      if (error.message.includes('violates foreign key constraint')) {
        return 'One or more selected values are invalid. Please check your selections.';
      }
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  protected abstract getCreateCacheOperations(data: CreateDTO): CacheOperation<T>;
  protected abstract getUpdateCacheOperations(id: number, data: UpdateDTO): CacheOperation<T>;

  async create(data: CreateDTO): Promise<{ data: T | null; errors: string[] }> {
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
        .select()
        .single();

      if (error) throw error;

      return { data: created as T, errors: [] };
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

  async update(id: number, data: UpdateDTO): Promise<{ data: T | null; errors: string[] }> {
    const validation = this.validateUpdate(data);
    if (!validation.isValid) {
      return { data: null, errors: validation.errors };
    }

    const cacheOps = this.getUpdateCacheOperations(id, data);
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

      const { data: updated, error } = await this.supabaseClient
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Apply post-update operations if any
      if (cacheOps.postUpdate) {
        for (const update of cacheOps.postUpdate) {
          const oldData = this.queryClient.getQueryData(update.queryKey);
          if (oldData) {
            this.queryClient.setQueryData(update.queryKey, update.update(oldData));
          }
        }
      }

      return { data: updated as T, errors: [] };
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

  /**
   * Manually invalidate specific caches
   * @param queryKeys Array of query keys to invalidate
   */
  async invalidateCaches(queryKeys: QueryKey[]): Promise<void> {
    await Promise.all(
      queryKeys.map(key => this.queryClient.invalidateQueries({ queryKey: key }))
    );
  }
} 
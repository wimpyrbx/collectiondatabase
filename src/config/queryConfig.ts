import { QueryKey, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

/**
 * Default cache configuration used across the application
 * These settings ensure consistent caching behavior
 */
export const DEFAULT_CACHE_CONFIG = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * Type-safe utility to create query options with consistent defaults
 * Allows overriding specific options while maintaining type safety
 */
export function createQueryOptions<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, keyof typeof DEFAULT_CACHE_CONFIG> & 
    Partial<typeof DEFAULT_CACHE_CONFIG>
): UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  return {
    ...DEFAULT_CACHE_CONFIG,
    ...options,
  };
}

/**
 * Default mutation configuration
 * Common settings for all mutations
 */
export const DEFAULT_MUTATION_CONFIG = {
  retry: 1, // Only retry once by default
  onError: (error: unknown) => {
    console.error('Mutation error:', error);
  },
} as const;

/**
 * Utility to create mutation options with consistent defaults
 * Particularly useful for table operations that need cache invalidation
 */
export function createMutationOptions<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown,
>(
  options: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, keyof typeof DEFAULT_MUTATION_CONFIG> &
    Partial<typeof DEFAULT_MUTATION_CONFIG> & {
      onError?: (error: TError, variables: TVariables, context: TContext) => void;
    }
): UseMutationOptions<TData, TError, TVariables, TContext> {
  return {
    ...DEFAULT_MUTATION_CONFIG,
    ...options,
  };
}

/**
 * Standard options used for prefetching queries
 * Ensures consistency between runtime queries and prefetched data
 */
export const PREFETCH_OPTIONS = {
  ...DEFAULT_CACHE_CONFIG,
} as const;

/**
 * Type-safe utility to create a query key
 * Supports both simple and compound keys
 */
export function createQueryKey<T extends string[]>(...parts: T): Readonly<T>;
export function createQueryKey<T extends string>(key: T): readonly [T];
export function createQueryKey<T extends string | string[]>(...parts: T[]): Readonly<T[]> {
  return Object.freeze(
    parts.length === 1 && typeof parts[0] === 'string' 
      ? [parts[0]] 
      : parts
  ) as Readonly<T[]>;
}

/**
 * Helper to generate cache invalidation patterns
 * Useful for invalidating groups of related queries
 */
export function createInvalidationPattern(baseKey: string | readonly string[]) {
  const key = Array.isArray(baseKey) ? baseKey : [baseKey];
  return {
    exact: key,
    startsWith: [key],
    contains: key[0],
  };
}

/**
 * Type for defining a query configuration with its associated types
 */
export interface QueryConfig<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> {
  queryKey: TQueryKey;
  queryFn: () => Promise<TQueryFnData>;
  select?: (data: TQueryFnData) => TData;
}

/**
 * Creates a reusable query configuration that can be shared
 * between hooks and preloaders
 */
export function createQueryConfig<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  config: QueryConfig<TQueryFnData, TError, TData, TQueryKey>
): QueryConfig<TQueryFnData, TError, TData, TQueryKey> {
  return config;
} 
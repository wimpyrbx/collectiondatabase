import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { QueryConfig, createQueryOptions } from '@/config/queryConfig';

type QueryOptionsWithoutDefaults<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey
> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  keyof typeof import('@/config/queryConfig').DEFAULT_CACHE_CONFIG
>;

/**
 * Creates a type-safe cache hook with consistent configuration
 * @param config The shared query configuration
 * @returns A hook that uses the configuration with optional overrides
 */
export function createCacheHook<
  TQueryFnData,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(config: QueryConfig<TQueryFnData, TError, TData, TQueryKey>) {
  return (options: Partial<QueryOptionsWithoutDefaults<TQueryFnData, TError, TData, TQueryKey>> = {}) => {
    return useQuery<TQueryFnData, TError, TData, TQueryKey>(
      createQueryOptions({
        ...config,
        ...options,
      })
    );
  };
} 
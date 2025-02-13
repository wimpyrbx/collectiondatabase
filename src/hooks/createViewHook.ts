import { QueryConfig } from '@/config/queryConfig';
import { createQueryKey, createQueryConfig } from '@/config/queryConfig';
import { createSupabaseQuery } from '@/utils/supabaseQuery';
import { createCacheHook } from '@/utils/createCacheHook';

interface ViewHookConfig<T> {
  name: string;
  viewName: string;
}

interface ViewHookResult<T> {
  queryKey: readonly [string];
  config: QueryConfig<T[], unknown, T[], readonly [string]>;
  useHook: ReturnType<typeof createCacheHook<T[], unknown, T[], readonly [string]>>;
}

export function createViewHook<T>({ name, viewName }: ViewHookConfig<T>): ViewHookResult<T> {
  const queryKey = createQueryKey(name);
  
  const config = createQueryConfig<T[], unknown, T[], readonly [string]>({
    queryKey,
    queryFn: createSupabaseQuery<T>(`view_${viewName}`),
  });
  
  return {
    queryKey,
    config,
    useHook: createCacheHook(config),
  };
} 
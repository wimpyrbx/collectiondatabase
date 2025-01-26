import { useBaseTagsCache } from './useBaseTagsCache';
import type { ProductTag } from '@/types/tags';

export const PRODUCT_TAGS_QUERY_KEY = ['products_tags'] as const;

export const useProductTagsCache = () => {
  return useBaseTagsCache({
    tableName: 'products_tags',
    queryKey: [...PRODUCT_TAGS_QUERY_KEY]
  }) as ReturnType<typeof useBaseTagsCache> & { data: ProductTag[] | undefined };
}; 
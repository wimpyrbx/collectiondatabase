import { useBaseTagsCache } from './useBaseTagsCache';
import type { InventoryTag } from '@/types/tags';

export const INVENTORY_TAGS_QUERY_KEY = ['inventory_tags'] as const;

export const useInventoryTagsCache = () => {
  return useBaseTagsCache({
    tableName: 'inventory_tags',
    queryKey: [...INVENTORY_TAGS_QUERY_KEY]
  }) as ReturnType<typeof useBaseTagsCache> & { data: InventoryTag[] | undefined };
}; 
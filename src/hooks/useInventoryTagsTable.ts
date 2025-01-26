import { useBaseTagsTable } from './useBaseTagsTable';
import { INVENTORY_TAGS_QUERY_KEY } from './useInventoryTagsCache';

export const useInventoryTagsTable = () => {
  return useBaseTagsTable({
    tableName: 'inventory_tags',
    queryKey: [...INVENTORY_TAGS_QUERY_KEY]
  });
}; 
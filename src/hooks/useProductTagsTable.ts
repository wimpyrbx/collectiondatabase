import { useBaseTagsTable } from './useBaseTagsTable';
import { PRODUCT_TAGS_QUERY_KEY } from './useProductTagsCache';

export const useProductTagsTable = () => {
  return useBaseTagsTable({
    tableName: 'products_tags',
    queryKey: [...PRODUCT_TAGS_QUERY_KEY]
  });
}; 
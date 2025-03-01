import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { isEqual } from 'lodash';

export interface CacheEntry {
  queryKey: string[];
  updatedAt: number;
  dataUpdatedAt: number;
  data: unknown;
}

export const useCacheMonitor = () => {
  const queryClient = useQueryClient();
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const previousEntriesRef = useRef<CacheEntry[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();
      
      const entries = queries.map(query => ({
        queryKey: query.queryKey as string[],
        updatedAt: query.state.dataUpdatedAt,
        dataUpdatedAt: query.state.dataUpdatedAt,
        data: query.state.data
      }));

      // Only update state if entries have changed
      if (!isEqual(entries, previousEntriesRef.current)) {
        previousEntriesRef.current = entries;
        setCacheEntries(entries);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return cacheEntries;
}; 
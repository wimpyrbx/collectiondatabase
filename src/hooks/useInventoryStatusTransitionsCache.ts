import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import type { InventoryStatusTransition, InventoryStatusTransitionMap } from '@/types/inventory_status';

export const INVENTORY_STATUS_TRANSITIONS_QUERY_KEY = ['inventory_status_transitions'] as const;

const fetchInventoryStatusTransitions = async (): Promise<InventoryStatusTransition[]> => {
  const { data, error } = await supabase
    .from('inventory_status_transitions')
    .select('*');

  if (error) {
    throw error;
  }

  return data;
};

export const useInventoryStatusTransitionsCache = () => {
  const query = useQuery({
    queryKey: INVENTORY_STATUS_TRANSITIONS_QUERY_KEY,
    queryFn: fetchInventoryStatusTransitions,
    gcTime: Infinity,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select: (data): InventoryStatusTransitionMap => {
      // Convert the flat list into a nested map for easier lookup
      return data.reduce((acc, transition) => {
        if (!acc[transition.from_status]) {
          acc[transition.from_status] = {};
        }
        acc[transition.from_status][transition.to_status] = {
          requires_sale_status: transition.requires_sale_status
        };
        return acc;
      }, {} as InventoryStatusTransitionMap);
    }
  });

  const isTransitionAllowed = (fromStatus: string, toStatus: string): boolean => {
    const transitions = query.data;
    if (!transitions) return false;
    return !!transitions[fromStatus]?.[toStatus];
  };

  const getRequiredSaleStatus = (fromStatus: string, toStatus: string): string | null => {
    const transitions = query.data;
    if (!transitions) return null;
    return transitions[fromStatus]?.[toStatus]?.requires_sale_status ?? null;
  };

  return {
    transitions: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isTransitionAllowed,
    getRequiredSaleStatus
  };
}; 
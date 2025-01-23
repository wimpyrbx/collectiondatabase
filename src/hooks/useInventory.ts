import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { InventoryViewItem } from '@/types/inventory';

const fetchInventory = async (): Promise<InventoryViewItem[]> => {
  const { data, error } = await supabase.from('view_inventory').select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const useInventory = () => {
  return useQuery<InventoryViewItem[]>({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });
};
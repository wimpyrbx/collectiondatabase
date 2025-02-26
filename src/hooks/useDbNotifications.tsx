// Add this as the first line to disable real-time notifications
export const useDbNotifications = () => {}; // Disabled notification listener

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { notify } from '@/utils/notifications';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

// Define tables we want to listen to
const MONITORED_TABLES = [
  'products',
  'inventory',
  'product_tags',
  'inventory_tags',
  'purchases',
  'sales'
] as const;

type MonitoredTable = typeof MONITORED_TABLES[number];

// Define what operations we want to monitor
type Operation = 'INSERT' | 'UPDATE' | 'DELETE';

// Define notification messages for each table and operation
const notificationMessages: Record<MonitoredTable, Partial<Record<Operation, string>>> = {
  products: {
    INSERT: 'New product added',
    UPDATE: 'Product updated',
    DELETE: 'Product deleted'
  },
  inventory: {
    INSERT: 'New inventory item added',
    UPDATE: 'Inventory item updated',
    DELETE: 'Inventory item deleted'
  },
  product_tags: {
    INSERT: 'Product tag added',
    UPDATE: 'Product tag updated',
    DELETE: 'Product tag removed'
  },
  inventory_tags: {
    INSERT: 'Inventory tag added',
    UPDATE: 'Inventory tag updated',
    DELETE: 'Inventory tag removed'
  },
  purchases: {
    INSERT: 'New purchase recorded',
    UPDATE: 'Purchase updated',
    DELETE: 'Purchase deleted'
  },
  sales: {
    INSERT: 'New sale recorded',
    UPDATE: 'Sale updated',
    DELETE: 'Sale deleted'
  }
};

// Helper function to get entity name from record
const getEntityName = (table: MonitoredTable, record: any): string => {
  switch (table) {
    case 'products':
      return record.product_title || 'Product';
    case 'inventory':
      return `Inventory #${record.id}`;
    case 'product_tags':
    case 'inventory_tags':
      return record.name || 'Tag';
    case 'purchases':
      return `Purchase #${record.id}`;
    case 'sales':
      return `Sale #${record.id}`;
    default:
      return 'Item';
  }
};

export const useDbNotifications = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a subscription for each table
    const subscriptions = MONITORED_TABLES.map(table => {
      return supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table
          },
          (payload: RealtimePostgresChangesPayload<any>) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            // Check if this change was caused by a local mutation
            const mutations = queryClient.getMutationCache().getAll();
            const isLocalMutation = mutations.some(mutation => 
              mutation.state.status === 'pending' || 
              (mutation.state.status === 'success' && Date.now() - mutation.state.submittedAt < 1000)
            );

            // Skip notification if this was a local mutation
            if (isLocalMutation) {
              return;
            }
            
            // Get the base message for this table and operation
            const baseMessage = notificationMessages[table][eventType as Operation];
            if (!baseMessage) return;

            // Get the entity name
            const entityName = getEntityName(table, eventType === 'DELETE' ? oldRecord : newRecord);

            // Construct the full message
            const message = `${baseMessage}: ${entityName}`;

            // Show the appropriate notification
            switch (eventType) {
              case 'INSERT':
                notify('success', message);
                break;
              case 'UPDATE':
                notify('info', message);
                break;
              case 'DELETE':
                notify('error', message);
                break;
            }
          }
        )
        .subscribe();
    });

    // Cleanup: remove subscriptions when component unmounts
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [queryClient]);
}; 
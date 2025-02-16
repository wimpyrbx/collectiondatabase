import { QueryClient, QueryKey } from '@tanstack/react-query';
import { trackLocalChange } from './tableChangesUtils';
import { supabase } from '@/supabaseClient';

export const handleCacheInvalidation = async (
    queryClient: QueryClient,
    affectedTables: string[],
    updateMasterTimestamp = true
) => {
    try {
        // Track our change with the affected tables
        trackLocalChange(affectedTables);

        // Update master timestamp
        if (updateMasterTimestamp) {
            const { error } = await supabase
                .from('site_settings')
                .update({ last_updated: new Date().toISOString() })
                .eq('key', 'master_timestamp');

            if (error) {
                console.error('Error updating master timestamp:', error);
            }
        }

        // Invalidate queries for affected tables
        for (const table of affectedTables) {
            await queryClient.invalidateQueries({ queryKey: [table] });
        }
    } catch (error) {
        console.error('Error handling cache invalidation:', error);
    }
}; 
import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { shouldInvalidateCache } from '@/utils/tableChangesUtils';
import { debugLog, DebugOutput } from '@/utils/debugUtils';

const CHECK_INTERVAL_MS = 5000;

export const ExternalChangeMonitor: React.FC = () => {
    const queryClient = useQueryClient();
    const lastCheckRef = useRef<number>(Date.now());

    useEffect(() => {
        const checkMasterTimestamp = async () => {
            try {
                // Ensure we don't check more frequently than intended
                const now = Date.now();
                if (now - lastCheckRef.current < CHECK_INTERVAL_MS) {
                    return;
                }
                lastCheckRef.current = now;

                const shouldInvalidate = await shouldInvalidateCache();
                
                if (shouldInvalidate) {
                    // Force invalidate ALL queries with specific options
                    await queryClient.invalidateQueries({
                        refetchType: 'all',  // Ensure we refetch all queries
                        type: 'all',         // Include active and inactive queries
                        exact: false         // Include all query key variations
                    });
                    debugLog('cache', 'All caches invalidated due to external change');
                }
            } catch (error) {
                debugLog('cache', 'Error in ExternalChangeMonitor', error);
            }
        };

        // Check immediately on mount
        checkMasterTimestamp();

        // Then check every interval
        const interval = setInterval(checkMasterTimestamp, CHECK_INTERVAL_MS);

        // Cleanup on unmount
        return () => {
            clearInterval(interval);
            debugLog('components', 'ExternalChangeMonitor stopped');
        };
    }, [queryClient]);

    return (
        <DebugOutput
            category="cache"
            message="External Change Monitor Active"
            data={{ checkInterval: CHECK_INTERVAL_MS }}
            className="fixed bottom-4 right-4 z-50"
        />
    );
}; 
import { supabase } from '@/supabaseClient';
import { debugLog } from './debugUtils';

// Constants
const GRACE_PERIOD_MS = 5000; // 5 seconds
const MASTER_TIMESTAMP_KEY = 'master_timestamp';

// Types
interface Change {
    timestamp: string;
    tables: string[];
}

interface TimestampResponse {
    last_updated: string;
}

// State
const ourChanges: Change[] = [];
const PAGE_LOAD_TIME = new Date().toISOString();
let lastProcessedTimestamp: string | null = null;

/**
 * Track a local change to one or more tables
 * @param tables The tables that were modified
 */
export const trackLocalChange = (tables: string[]): void => {
    const timestamp = new Date().toISOString();
    ourChanges.push({ timestamp, tables });
    
    // Clean up old timestamps
    const now = new Date().getTime();
    const oldChanges = ourChanges.filter(change => 
        now - new Date(change.timestamp).getTime() > GRACE_PERIOD_MS
    );
    oldChanges.forEach(change => {
        const index = ourChanges.indexOf(change);
        if (index > -1) {
            ourChanges.splice(index, 1);
        }
    });

    debugLog('changes', 'Tracked local change', {
        timestamp,
        tables,
        activeChanges: ourChanges.length
    });
};

/**
 * Check if a timestamp matches one of our local changes
 * @param timestamp The timestamp to check
 * @returns boolean indicating if this was our change
 */
export const isOurChange = (timestamp: string): boolean => {
    // If the timestamp is from before the page loaded, it's not an external change
    if (new Date(timestamp) <= new Date(PAGE_LOAD_TIME)) {
        return true;
    }

    // Otherwise check if it's one of our tracked changes
    return ourChanges.some(change => {
        const date1 = new Date(change.timestamp);
        const date2 = new Date(timestamp);
        return Math.abs(date1.getTime() - date2.getTime()) <= GRACE_PERIOD_MS;
    });
};

/**
 * Check if there are external changes that should trigger cache invalidation
 * @returns Promise<boolean> indicating if cache should be invalidated
 */
export const shouldInvalidateCache = async (): Promise<boolean> => {
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('last_updated')
            .eq('key', MASTER_TIMESTAMP_KEY)
            .single();
            
        if (error) {
            debugLog('changes', 'Error fetching master timestamp', error);
            return false;
        }

        if (!data?.last_updated) {
            debugLog('changes', 'No master timestamp found');
            return false;
        }

        // If we've already processed this timestamp, don't invalidate again
        if (lastProcessedTimestamp === data.last_updated) {
            debugLog('changes', 'No changes since last check', {
                current: data.last_updated,
                lastProcessed: lastProcessedTimestamp
            });
            return false;
        }
        
        const wasOurChange = isOurChange(data.last_updated);
        debugLog('changes', 'New timestamp detected', {
            timestamp: data.last_updated,
            pageLoadTime: PAGE_LOAD_TIME,
            lastProcessed: lastProcessedTimestamp,
            ourChanges: ourChanges.map(c => ({ 
                timestamp: c.timestamp, 
                tables: c.tables 
            })),
            isOurChange: wasOurChange
        });

        // Update the last processed timestamp
        lastProcessedTimestamp = data.last_updated;
        
        return !wasOurChange;
    } catch (error) {
        debugLog('changes', 'Error checking master timestamp', error);
        return false;
    }
}; 
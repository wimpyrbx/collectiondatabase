import React, { useEffect } from 'react';
import { useCacheMonitor } from '@/hooks/useCacheMonitor';
import { FaDatabase, FaTimes, FaClock } from 'react-icons/fa';
import clsx from 'clsx';
import { CacheDataModal } from './modal/CacheDataModal';
import { TagsRelationshipView } from '@/types/tags';

interface CacheMonitorProps {
  collapsed: boolean;
}

const getEntryCount = (entry: ReturnType<typeof useCacheMonitor>[0]) => {
  // If it's an array, return its length
  if (Array.isArray(entry.data)) {
    return entry.data.length.toString();
  }
  
  // Special handling for tags view
  if (entry.queryKey[0] === 'tags' && entry.data) {
    const tagsData = entry.data as TagsRelationshipView;
    if (tagsData.combined_data) {
      const productsCount = Object.keys(tagsData.combined_data.products || {}).length;
      const inventoryCount = Object.keys(tagsData.combined_data.inventory || {}).length;
      return `${productsCount}/${inventoryCount}`;
    }
  }

  // Handle null/undefined data
  if (!entry.data) {
    return '0';
  }
  
  return '1';
};

const getEntryCountColor = (entry: ReturnType<typeof useCacheMonitor>[0]) => {
  if (Array.isArray(entry.data)) {
    return entry.data.length > 0 ? 'text-green-500' : 'text-gray-500';
  }
  
  if (entry.queryKey[0] === 'tags' && entry.data) {
    const tagsData = entry.data as TagsRelationshipView;
    if (tagsData.combined_data) {
      return 'text-green-500';
    }
  }

  // For non-array data, green if data exists
  if (entry.data) {
    return 'text-green-500';
  }
  
  return 'text-gray-500';
};

export const CacheMonitor: React.FC<CacheMonitorProps> = ({ collapsed }) => {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [selectedEntry, setSelectedEntry] = React.useState<ReturnType<typeof useCacheMonitor>[0] | null>(null);
  const cacheEntries = useCacheMonitor();

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === '|') {
        setIsEnabled(prev => {
          if (prev) {
            // Close any open modals when disabling
            setSelectedEntry(null);
          }
          return !prev;
        });
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  if (!isEnabled) {
    return (
      <button
        onClick={() => setIsEnabled(true)}
        className={clsx(
          'flex items-center gap-2',
          'bg-cyan-800/30 backdrop-blur-sm rounded-xl p-2 py-1',
          'border border-cyan-600/30 shadow-md shadow-black/30',
          'hover:bg-cyan-700/50 hover:border-gray-600/50 transition-all duration-200',
          'group',
          collapsed ? 'justify-center' : 'w-full'
        )}
      >
        <FaDatabase className="w-3 h-3 text-orange-400 group-hover:scale-110 transition-transform duration-200" />
        {!collapsed && <span className="text-gray-200 text-sm group-hover:text-gray-300 transition-colors duration-200">Cache Monitor</span>}
      </button>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className={clsx(
        'flex items-center shadow-md shadow-black/30',
        collapsed ? 'justify-center' : 'justify-between',
        'bg-cyan-800/30 backdrop-blur-sm rounded-xl p-2 py-1',
        'border border-cyan-600/30',
        'cursor-pointer'
      )}
      onClick={() => {
        setSelectedEntry(null);
        setIsEnabled(false);
      }}
      >
        <div className={clsx(
          'flex items-center gap-2',
          collapsed && 'justify-center'
        )}>
          <FaDatabase className="w-3 h-3 text-orange-400" />
          {!collapsed && <span className="text-sm font-medium text-gray-300">Cache Monitor</span>}
        </div>
      </div>

      <div className="space-y-2">
        {cacheEntries.map((entry) => {
          const key = entry.queryKey.join('.');
          const age = Math.round((Date.now() - entry.dataUpdatedAt) / 1000);
          
          return (
            <button
              key={key}
              onClick={() => setSelectedEntry(entry)}
              className={clsx(
                'w-full text-left',
                'bg-gray-700/20 backdrop-blur-sm rounded-xl p-2 uppercase px-3 pb-1.5 shadow-md shadow-black/30',
                'border border-gray-700/30',
                'hover:bg-gray-800/30 hover:border-gray-600/50',
                'transition-all duration-200 group'
              )}
            >
            <div className="grid grid-cols-[60%,1fr,1fr]">
                <div className="font-medium text-gray-300 truncate text-xs">
                    {collapsed ? '...' : key}
                </div>
                    {/* right align */}
                <div className="text-gray-500 text-xs w-[25px] flex justify-end">
                    <span className="text-gray-500 text-xs">(
                      <span className={getEntryCountColor(entry)}>
                        {getEntryCount(entry)}
                      </span>
                    )</span>
                </div>
                {/* right align */}
                <div className="flex items-center gap-1.5 text-[9px] lowercase text-gray-500 group-hover:text-gray-400 justify-end">
                    <FaClock className="w-3 h-3" />
                    <span><span className="text-gray-300">{age}</span></span>
                </div>
            </div>
            </button>
          );
        })}

        {cacheEntries.length === 0 && (
          <div className="text-gray-500 text-center py-3 text-sm bg-gray-800/20 backdrop-blur-sm rounded-xl border border-gray-700/30">
            No cache entries
          </div>
        )}
      </div>

      {selectedEntry && (
        <CacheDataModal
          isOpen={true}
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}; 
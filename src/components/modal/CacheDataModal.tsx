import React from 'react';
import { Dialog } from '@headlessui/react';
import { CacheEntry } from '@/hooks/useCacheMonitor';
import { useQueryClient } from '@tanstack/react-query';

interface CacheDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: CacheEntry | null;
}

export const CacheDataModal: React.FC<CacheDataModalProps> = ({ isOpen, onClose, entry }) => {
  const queryClient = useQueryClient();
  const cacheData = entry ? queryClient.getQueryData(entry.queryKey) : null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

      {/* Full-screen container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-3xl w-full bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="border-b border-gray-700 p-4">
            <Dialog.Title className="text-lg font-medium text-gray-200">
              Cache Data: {entry?.queryKey.join('.')}
            </Dialog.Title>
            <div className="mt-1 text-sm text-gray-400">
              Last updated: {entry ? new Date(entry.dataUpdatedAt).toLocaleString() : ''}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[70vh] overflow-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-900/50 p-4 rounded-lg">
              {JSON.stringify(cacheData, null, 2)}
            </pre>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100 
                       bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}; 
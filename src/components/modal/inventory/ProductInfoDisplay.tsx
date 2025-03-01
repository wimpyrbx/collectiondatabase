import React, { useEffect, useRef } from 'react';
import { FaBox, FaLayerGroup, FaCubes, FaGlobe, FaCalendar } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import regionsData from '@/data/regions.json';
import { getRatingDisplayInfo } from '@/utils/productUtils';
import { useQueryClient } from '@tanstack/react-query';
import { isEqual } from 'lodash';

// Use destructuring to get isEqual from lodash
// const { isEqual } = lodash;

interface ProductInfoDisplayProps {
  inventory: InventoryViewItem | null;
}

export const ProductInfoDisplay: React.FC<ProductInfoDisplayProps> = ({ inventory }) => {
  const queryClient = useQueryClient();
  
  // Use ref to store the current inventory data to avoid re-renders
  const inventoryRef = useRef<InventoryViewItem | null>(inventory);
  
  // Use ref to track the inventory ID to detect changes
  const inventoryIdRef = useRef<number | null>(inventory?.inventory_id || null);
  
  // Force re-render when needed
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  
  // Update refs when inventory prop changes
  useEffect(() => {
    if (inventory?.inventory_id !== inventoryIdRef.current) {
      inventoryIdRef.current = inventory?.inventory_id || null;
      inventoryRef.current = inventory;
      forceUpdate();
    }
  }, [inventory]);
  
  // Set up cache subscription only once
  useEffect(() => {
    // Function to check cache for updates
    const checkCacheForUpdates = () => {
      // Get the latest inventory data from cache
      const inventoryData = queryClient.getQueryData<InventoryViewItem[]>(['inventory']);
      
      // Only update if the inventory data exists
      if (inventoryData && inventoryIdRef.current) {
        const cachedInventory = inventoryData.find(item => 
          item.inventory_id === inventoryIdRef.current
        );
        
        // Only update if the data has actually changed (deep comparison)
        if (cachedInventory && !isEqual(cachedInventory, inventoryRef.current)) {
          inventoryRef.current = cachedInventory;
          forceUpdate();
        }
      }
    };
    
    // Subscribe to query cache changes
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      checkCacheForUpdates();
    });
    
    // Initial check from cache
    checkCacheForUpdates();
    
    return () => {
      unsubscribe();
    };
  }, [queryClient]);
  
  // Get the current inventory data from ref
  const latestInventory = inventoryRef.current;
  
  if (!latestInventory) return null;

  return (
    <div className="bg-gray-900/40 rounded-lg overflow-hidden shadow-md shadow-black/30">
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h3 className="font-medium text-gray-300 flex items-center gap-2">
          <FaBox className="text-cyan-400" />
          Product Information
        </h3>
      </div>
      <div className="p-4 pr-1">
        <div className="relative flex">
          {/* Region Rating Image - Floating Right */}
          {(() => {
            const ratingInfo = getRatingDisplayInfo(
              latestInventory?.region_name || '', 
              latestInventory?.rating_name || '', 
              regionsData.regions
            );
            return ratingInfo && ratingInfo.imagePath ? (
              <div className="absolute right-0 h-full aspect-square">
                <img 
                  src={ratingInfo.imagePath} 
                  alt={latestInventory?.rating_name || ''} 
                  className="h-full w-full object-contain shadow-lg shadow-black/30" 
                />
              </div>
            ) : null;
          })()}

          {/* Main Content - With right padding for rating image */}
          <div className="flex-1 pr-[100px]">
            {/* Group and Type */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <FaLayerGroup className="text-indigo-400" />
              <span>{latestInventory?.product_group_name || '-'}</span>
              <span className="mx-2">•</span>
              <FaCubes className="text-pink-400" />
              <span>{latestInventory?.product_type_name || '-'}</span>
            </div>

            {/* Title and Variant */}
            <div className="mb-2">
              <h4 className="text-xl font-medium text-gray-200">
                {latestInventory?.product_title || '-'}
                {latestInventory?.product_variant && (
                  <span className="text-gray-400 ml-2">({latestInventory.product_variant})</span>
                )}
              </h4>
            </div>

            {/* Region and Year */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <FaGlobe className="text-blue-400" />
              <span>{latestInventory?.region_name || '-'}</span>
              <span className="mx-2">•</span>
              <FaCalendar className="text-yellow-400" />
              <span>{latestInventory?.release_year || '-'}</span>
            </div>

            {/* Inventory Status Summary */}
            <div className="text-sm text-gray-300">
              {(() => {
                if (!latestInventory) return 'No inventory data available';
                
                if (latestInventory.total_count === 0) return 'No other entries of this item in inventory';
                
                if (latestInventory.total_count === undefined || latestInventory.total_count === null) {
                  return 'Count data not available';
                }
                
                if (latestInventory.total_count === 1) return 'This is the only entry of this item in inventory';
                
                const statusCounts = new Map();
                if (latestInventory.normal_count) statusCounts.set('Normal', latestInventory.normal_count);
                if (latestInventory.collection_count) statusCounts.set('Collection', latestInventory.collection_count);
                if (latestInventory.for_sale_count) statusCounts.set('For Sale', latestInventory.for_sale_count);
                if (latestInventory.sold_count) statusCounts.set('Sold', latestInventory.sold_count);
                
                return `${latestInventory.total_count} total entries: ${Array.from(statusCounts.entries())
                  .map(([status, count]) => `${count} ${status}`)
                  .join(', ')}`;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoDisplay; 
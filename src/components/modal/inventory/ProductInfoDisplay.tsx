import React from 'react';
import { FaBox, FaLayerGroup, FaCubes, FaGlobe, FaCalendar } from 'react-icons/fa';
import { InventoryViewItem } from '@/types/inventory';
import regionsData from '@/data/regions.json';
import { getRatingDisplayInfo } from '@/utils/productUtils';

interface ProductInfoDisplayProps {
  inventory: InventoryViewItem | null;
}

export const ProductInfoDisplay: React.FC<ProductInfoDisplayProps> = ({ inventory }) => {
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
              inventory?.region_name || '', 
              inventory?.rating_name || '', 
              regionsData.regions
            );
            return ratingInfo && ratingInfo.imagePath ? (
              <div className="absolute right-0 h-full aspect-square">
                <img 
                  src={ratingInfo.imagePath} 
                  alt={inventory?.rating_name || ''} 
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
              <span>{inventory?.product_group_name || '-'}</span>
              <span className="mx-2">•</span>
              <FaCubes className="text-pink-400" />
              <span>{inventory?.product_type_name || '-'}</span>
            </div>

            {/* Title and Variant */}
            <div className="mb-2">
              <h4 className="text-xl font-medium text-gray-200">
                {inventory?.product_title || '-'}
                {inventory?.product_variant && (
                  <span className="text-gray-400 ml-2">({inventory.product_variant})</span>
                )}
              </h4>
            </div>

            {/* Region and Year */}
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <FaGlobe className="text-blue-400" />
              <span>{inventory?.region_name || '-'}</span>
              <span className="mx-2">•</span>
              <FaCalendar className="text-yellow-400" />
              <span>{inventory?.release_year || '-'}</span>
            </div>

            {/* Inventory Status Summary */}
            <div className="text-sm text-gray-300">
              {(() => {
                if (!inventory?.total_count) return 'Error loading inventory count';
                if (inventory.total_count === 1) return 'This is the only entry of this item in inventory';
                
                // Group items by status
                const statusCounts = new Map();
                if (inventory.normal_count) statusCounts.set('Normal', inventory.normal_count);
                if (inventory.collection_count) statusCounts.set('Collection', inventory.collection_count);
                if (inventory.for_sale_count) statusCounts.set('For Sale', inventory.for_sale_count);
                if (inventory.sold_count) statusCounts.set('Sold', inventory.sold_count);
                
                return `${inventory.total_count} total entries: ${Array.from(statusCounts.entries())
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
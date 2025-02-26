import React from 'react';
import { FaBox } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';
import { InventoryViewItem } from '@/types/inventory';

interface HeaderSectionProps {
  inventory: InventoryViewItem | null;
  mode: 'create' | 'edit';
}

const HeaderSection: React.FC<HeaderSectionProps> = ({ inventory, mode }) => {
  return (
    <div className="shrink-0 ml-4 whitespace-nowrap flex items-center gap-4">
      {inventory?.inventory_updated_at && 
        new Date().getTime() - new Date(inventory.inventory_updated_at).getTime() <= 3600000 && (
        <span className="text-cyan-300 text-sm flex items-center gap-2">
          <FiClock className="w-4 h-4" />
          Recently Updated
        </span>
      )}
      {inventory ? `ID: ${inventory.inventory_id}` : undefined}
    </div>
  );
};

export default HeaderSection; 
import React from 'react';
import { InventoryViewItem } from '@/types/inventory';

interface ContentLayoutProps {
  leftColumn: React.ReactNode;
  rightColumn: React.ReactNode;
}

const ContentLayout: React.FC<ContentLayoutProps> = ({
  leftColumn,
  rightColumn
}) => {
  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left Column - Image and Barcodes */}
      <div className="col-span-3 space-y-4">
        {leftColumn}
      </div>

      {/* Right Column - Form Fields */}
      <div className="col-span-9 space-y-6">
        {rightColumn}
      </div>
    </div>
  );
};

export default ContentLayout; 
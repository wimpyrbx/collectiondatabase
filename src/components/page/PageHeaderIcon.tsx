// src/components/page/PageHeaderIcon.tsx
import React from 'react';

interface PageHeaderIconProps {
  icon: React.ReactNode;
  iconColor?: string;
}

const PageHeaderIcon: React.FC<PageHeaderIconProps> = ({ icon, iconColor = 'white' }) => {
  return (
    <div className={`flex items-center justify-center w-12 h-12 pl-3 mr-3 ${iconColor}`}>
      <div className="w-full h-full">
        {React.cloneElement(icon as React.ReactElement, {
          className: 'w-full h-full'
        })}
      </div>
    </div>
  );
};

export default PageHeaderIcon; 
// src/components/Page.tsx
import React from 'react';
import PageHeader from './PageHeader';

interface PageProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  infoBoxes?: React.ReactNode[];
  bgColor?: string;
  children: React.ReactNode;
}

const Page: React.FC<PageProps> = ({ 
  title,
  subtitle,
  icon,
  iconColor,
  infoBoxes,
  bgColor = 'bg-gray-800',
  children 
}) => {
  return (
    <div className="container mx-auto mt-6">
      <PageHeader 
        title={title}
        subtitle={subtitle}
        icon={icon}
        iconColor={iconColor}
        infoBoxes={infoBoxes}
        bgColor={bgColor}
      />
      <div>
        {children}
      </div>
    </div>
  );
};

export default Page;
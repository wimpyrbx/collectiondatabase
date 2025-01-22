// src/components/page/PageHeaderInfoBox.tsx
import clsx from 'clsx';
import React, { ReactNode } from 'react';

interface PageHeaderInfoBoxProps {
  children: ReactNode;
  className?: string;
} 

const PageHeaderInfoBox: React.FC<PageHeaderInfoBoxProps> = ({ children, className }) => {
  return <div className={clsx("p-2 bg-gray-700 text-gray-200 rounded-md", className)}>{children}</div>;
};

export default PageHeaderInfoBox; 
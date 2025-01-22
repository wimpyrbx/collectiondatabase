// src/components/page/PageHeaderSubText.tsx
import React, { ReactNode } from 'react';

interface PageHeaderSubTextProps {
  children: ReactNode;
}

const PageHeaderSubText: React.FC<PageHeaderSubTextProps> = ({ children }) => {
  return <h2 className="text-xs text-gray-400 italic">{children}</h2>;
};

export default PageHeaderSubText; 
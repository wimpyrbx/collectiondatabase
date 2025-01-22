// src/components/page/PageHeaderText.tsx
import React, { ReactNode } from 'react';

interface HeaderTextProps {
  children: ReactNode;
}

const HeaderText: React.FC<HeaderTextProps> = ({ children }) => {
  return <h1 className="text-xl font-bold text-white">{children}</h1>;
};

export default HeaderText; 
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed inset-0 flex bg-gray-900">
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <main className={clsx(
        'flex-1 overflow-auto p-6 pt-0 transition-all duration-300',
        collapsed ? 'ml-20' : 'ml-64'
      )}>
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout; 
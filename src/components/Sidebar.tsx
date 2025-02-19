// src/components/Sidebar.tsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaInfoCircle, FaEnvelope, FaWpforms, FaQuestionCircle, FaLayerGroup, FaSearch, FaChevronRight, FaBoxes, FaTags } from 'react-icons/fa';
import clsx from 'clsx';
import { CacheMonitor } from './CacheMonitor';

// Add these types at the top after imports
type MenuItem = {
  path: string;
  label: string;
  icon: JSX.Element;
  iconColor: string;
  hoverColor: string;
};

type MenuCategory = {
  label: string;
  items: MenuItem[];
};

type MenuCategories = {
  [key: string]: MenuCategory;
};

const menuCategories: MenuCategories = {
  main: {
    label: 'Main',
    items: [
      { 
        path: '/', 
        label: 'Home', 
        icon: <FaHome />, 
        iconColor: 'text-emerald-400',
        hoverColor: 'hover:text-emerald-300'
      },
      { 
        path: '/inventory', 
        label: 'Inventory', 
        icon: <FaBoxes />, 
        iconColor: 'text-cyan-400',
        hoverColor: 'hover:text-cyan-300'
      },
      { 
        path: '/tags', 
        label: 'Tags', 
        icon: <FaTags />, 
        iconColor: 'text-purple-400',
        hoverColor: 'hover:text-purple-300'
      },
      { 
        path: '/about', 
        label: 'About', 
        icon: <FaInfoCircle />, 
        iconColor: 'text-blue-400',
        hoverColor: 'hover:text-blue-300'
      },
      { 
        path: '/contact', 
        label: 'Contact', 
        icon: <FaEnvelope />, 
        iconColor: 'text-purple-400',
        hoverColor: 'hover:text-purple-300'
      },
    ]
  },
  components: {
    label: 'Components',
    items: [
      { 
        path: '/form-elements-showcase', 
        label: 'Form Elements', 
        icon: <FaWpforms />, 
        iconColor: 'text-pink-400',
        hoverColor: 'hover:text-pink-300'
      },
      { 
        path: '/tooltip-showcase', 
        label: 'Tooltips', 
        icon: <FaQuestionCircle />, 
        iconColor: 'text-amber-400',
        hoverColor: 'hover:text-amber-300'
      },
      { 
        path: '/card-showcase', 
        label: 'Cards', 
        icon: <FaLayerGroup />, 
        iconColor: 'text-cyan-400',
        hoverColor: 'hover:text-cyan-300'
      },
    ]
  }
};

// Add to interface after other types
interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

const AgeUpdateDebug: React.FC<{ collapsed: boolean }> = ({ collapsed }) => {
  const [updateCount, setUpdateCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    // Listen for age column updates
    const handleAgeUpdate = () => {
      setUpdateCount(prev => prev + 1);
      setIsFlashing(true);
      // Remove flash after 2 seconds
      setTimeout(() => setIsFlashing(false), 200);
    };

    window.addEventListener('age-column-update', handleAgeUpdate);
    return () => window.removeEventListener('age-column-update', handleAgeUpdate);
  }, []);

  return (
    <div className={clsx(
      'rounded-lg p-2 border',
      'transition-all duration-[300ms] ease-out',
      'shadow-md shadow-black/30',
      isFlashing 
        ? 'bg-green-500/20 border-green-500/30' 
        : 'bg-gray-800/50 border-gray-700/50',
      'text-xs'
    )}>
      <div className={clsx(
        'flex items-center gap-2',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <span className={clsx(
            'text-gray-400 transition-colors duration-[300ms]',
            isFlashing && 'text-cyan-300/80'
          )}>
            Age Updates:
          </span>
        )}
        <span className={clsx(
          'font-mono transition-colors duration-[300ms]',
          isFlashing ? 'text-cyan-300' : 'text-cyan-400'
        )}>
          {updateCount}
        </span>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onCollapse }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const filteredCategories = Object.entries(menuCategories).reduce((acc, [key, category]) => {
    const filteredItems = category.items.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredItems.length > 0) {
      acc[key] = { ...category, items: filteredItems };
    }
    return acc;
  }, {} as typeof menuCategories);

  return (
    <div 
      className={clsx(
        'h-screen bg-gray-800/40 backdrop-blur-md flex-shrink-0 fixed left-0 top-0',
        'border-r border-gray-700 transition-all duration-300 ease-in-out',
        'overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        collapsed ? 'w-20' : 'w-64',
        'shadow-xl shadow-black/20'
      )}
    >
      <div className="relative h-full">
        {/* Collapse Toggle */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className={clsx(
            "absolute bg-gray-800 rounded-full p-1 shadow-md shadow-black/20 hover:bg-gray-700 transition-colors",
            collapsed ? "left-1/2 -translate-x-1/2 top-6" : "right-5 top-6"
          )}
        >
          <FaChevronRight className={clsx(
            'text-gray-400 transition-transform duration-200',
            collapsed ? 'rotate-180' : ''
          )} />
        </button>

        {/* Logo/Brand Area */}
        <div className={clsx(
          'transition-all duration-300',
          collapsed ? 'px-4 py-6 mb-4' : 'p-6'
        )}>
          <h1 className={clsx(
            'font-bold text-white text-transparent transition-all duration-300',
            collapsed ? 'hidden' : 'text-xl'
          )}>
            COLLECTION DB
          </h1>
        </div>

        {/* Search Bar */}
        {!collapsed && (
          <div className="px-6 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800/50 rounded-lg px-4 py-2 pl-10 text-sm text-gray-300 
                          placeholder-gray-500 border border-gray-700/50 focus:outline-none focus:border-gray-600
                          transition-colors"
              />
              <FaSearch className="absolute left-3 top-2.5 text-gray-500" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={clsx('transition-all duration-300', collapsed ? 'px-2' : 'px-4')}>
          {Object.entries(filteredCategories).map(([key, category]) => (
            <div key={key} className="mb-6">
              {!collapsed && (
                <h2 
                  className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2 cursor-pointer"
                  onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                >
                  {category.label}
                </h2>
              )}
              <ul className={clsx(
                'space-y-1 transition-all duration-200',
                !collapsed && expandedCategory !== null && expandedCategory !== key && 'opacity-50'
              )}>
                {category.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={clsx(
                          'group flex items-center gap-3 rounded-lg transition-all duration-200',
                          collapsed ? 'justify-center p-3' : 'px-3 py-2',
                          'hover:bg-gray-800/30',
                          isActive
                            ? 'bg-gray-800/50 shadow-sm shadow-black/5 backdrop-blur-sm'
                            : 'text-gray-400',
                          'relative'
                        )}
                      >
                        <span className={clsx(
                          'text-lg transition-all duration-200',
                          isActive ? item.iconColor : 'text-gray-500',
                          !isActive && item.hoverColor,
                          'group-hover:scale-110'
                        )}>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className={clsx(
                            'font-medium tracking-wide transition-colors duration-200 whitespace-nowrap',
                            isActive ? 'text-gray-100' : 'text-gray-400',
                            'group-hover:text-gray-300'
                          )}>
                            {item.label}
                          </span>
                        )}
                        {/* Active Indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Cache Monitor */}
        <div className={clsx(
          'absolute bottom-24 mb-1.5 transition-all duration-300',
          collapsed ? 'left-2 right-2' : 'left-6 right-6'
        )}>
          <CacheMonitor collapsed={collapsed} />
        </div>

        {/* Age Update Debug */}
        <div className={clsx(
          'absolute bottom-14 transition-all duration-300',
          collapsed ? 'left-2 right-2' : 'left-6 right-6'
        )}>
          <AgeUpdateDebug collapsed={collapsed} />
        </div>

        {/* Footer Area */}
        <div className={clsx(
          'absolute bottom-6 border-t border-gray-800/50 pt-4 transition-all duration-300',
          collapsed ? 'left-2 right-2' : 'left-6 right-6'
        )}>
          <div className={clsx(
            'text-xs text-gray-500 text-center font-medium tracking-wider',
            collapsed && 'text-[10px]'
          )}>
            Collection DB v1.0.2
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
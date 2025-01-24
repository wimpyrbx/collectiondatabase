import React from 'react';
import clsx from 'clsx';
import { cardStyles } from './styles';
import type { CardHeaderProps } from './types';

const CardHeader: React.FC<CardHeaderProps> = ({ 
  title, 
  collapsible,
  isCollapsed,
  onCollapseToggle,
  bgColor = 'bg-gray-700',
  textColor = 'text-white',
  rightContent,
  icon,
  iconColor = 'text-gray-400'
}) => {
  return (
    <div className={clsx(cardStyles.header, bgColor, "grid grid-cols-2 gap-2")}>
      <div className="flex items-center space-x-3 col-span-1">
        {icon && <span className={clsx(iconColor, cardStyles.headerIcon)}>{icon}</span>}
        <h3 className={clsx(cardStyles.headerTitle, textColor)}>
          {title}
        </h3>
      </div>
      <div className="flex items-center space-x-3 justify-end col-span-1">
        {rightContent && <span className="text-gray-400 text-md">{rightContent}</span>}
        {collapsible && (
        <button 
          onClick={onCollapseToggle}
          className={clsx(cardStyles.collapseButton, "text-gray-400 ml-3")}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      )}
      </div>
    </div>
  );
};

export default CardHeader; 
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
    <div className={clsx(cardStyles.header, bgColor, "flex justify-between items-center")}>
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {icon && <span className={clsx(iconColor, cardStyles.headerIcon)}>{icon}</span>}
        <h3 className={clsx(cardStyles.headerTitle, textColor, "truncate")}>
          {title}
        </h3>
      </div>
      <div className="flex items-center space-x-3 justify-end shrink-0">
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
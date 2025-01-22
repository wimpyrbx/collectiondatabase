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
  icon,
  iconColor = 'text-gray-400'
}) => {
  return (
    <div className={clsx(cardStyles.header, bgColor)}>
      <div className="flex items-center space-x-2">
        {icon && <span className={clsx(iconColor, cardStyles.headerIcon)}>{icon}</span>}
        <h3 className={clsx(cardStyles.headerTitle, textColor)}>
          {title}
        </h3>
      </div>
      {collapsible && (
        <button 
          onClick={onCollapseToggle}
          className={cardStyles.collapseButton}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      )}
    </div>
  );
};

export default CardHeader; 
import React from 'react';
import { cardStyles } from './styles';
import type { CardHeaderProps } from './types';

const CardHeader: React.FC<CardHeaderProps> = ({ 
  title, 
  collapsible,
  startCollapsed = false,
  isCollapsed,
  onCollapseToggle
}) => {
  return (
    <div className={cardStyles.header}>
      <h3 className={cardStyles.headerTitle}>{title}</h3>
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
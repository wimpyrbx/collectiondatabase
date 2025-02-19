import React from 'react';
import { cardStyles } from './styles';
import type { CardBodyProps } from './types';
import clsx from 'clsx';

const CardBody: React.FC<CardBodyProps> = ({ children, isCollapsed, className }) => {
  return (
    <div 
      className={clsx(
        cardStyles.collapsible,
        isCollapsed ? cardStyles.collapsed : cardStyles.expanded
      )}
    >
      <div className={clsx(cardStyles.body, className)}>
        {children}
      </div>
    </div>
  );
};

export default CardBody; 
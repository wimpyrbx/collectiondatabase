import React from 'react';
import { cardStyles } from './styles';
import type { CardFooterProps } from './types';
import clsx from 'clsx';

const CardFooter: React.FC<CardFooterProps> = ({ children, isCollapsed, className }) => {
  return (
    <div 
      className={clsx(
        cardStyles.collapsible,
        isCollapsed ? cardStyles.collapsed : cardStyles.expanded
      )}
    >
      <div className={clsx(cardStyles.footer, className)}>
        {children}
      </div>
    </div>
  );
};

export default CardFooter; 
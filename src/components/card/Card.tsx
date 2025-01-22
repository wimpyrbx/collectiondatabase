import React, { useState } from 'react';
import { cardStyles } from './styles';
import CardHeader from './CardHeader';
import CardBody from './CardBody';
import CardFooter from './CardFooter';
import type { CardCompositionProps } from './types';
import clsx from 'clsx';

interface CardCompoundComponents {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
}

const Card: React.FC<CardCompositionProps> & CardCompoundComponents = ({ 
  children, 
  className = '' 
}) => {
  // Find the CardHeader child to get its startCollapsed prop
  const headerChild = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === CardHeader
  ) as React.ReactElement | undefined;

  const startCollapsed = headerChild?.props?.startCollapsed ?? false;
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed);

  // Pass collapse state to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      // For CardHeader, pass setIsCollapsed and isCollapsed
      if (child.type === CardHeader) {
        return React.cloneElement(child, {
          ...child.props,
          isCollapsed,
          onCollapseToggle: () => setIsCollapsed(!isCollapsed)
        });
      }
      // For Body and Footer, pass isCollapsed
      return React.cloneElement(child, {
        ...child.props,
        isCollapsed
      });
    }
    return child;
  });

  return (
    <div className={clsx(cardStyles.container, className)}>
      {childrenWithProps}
    </div>
  );
};

// Attach compound components
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card; 
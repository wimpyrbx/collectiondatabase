import React from 'react';
import clsx from 'clsx';
import CardHeader from './CardHeader';
import CardBody from './CardBody';
import CardFooter from './CardFooter';

interface CardCompositionProps {
  children: React.ReactNode;
  className?: string;
  modal?: boolean;
}

interface CardCompoundComponents {
  Header: typeof CardHeader;
  Body: typeof CardBody;
  Footer: typeof CardFooter;
}

const cardStyles = {
  container: 'bg-gray-800 rounded-md shadow-md shadow-black/20 overflow-hidden'
};

const Card: React.FC<CardCompositionProps> & CardCompoundComponents = ({ 
  children, 
  className = '',
  modal = false
}) => {
  // Find the CardHeader child to get its startCollapsed prop
  const cardHeader = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === CardHeader
  ) as React.ReactElement | undefined;

  const [isCollapsed, setIsCollapsed] = React.useState(cardHeader?.props.startCollapsed ?? false);

  // Clone children to pass isCollapsed state
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      if (child.type === CardHeader) {
        return React.cloneElement(child as React.ReactElement<any>, {
          isCollapsed,
          onCollapse: () => setIsCollapsed(!isCollapsed)
        });
      }
      if (child.type === CardBody || child.type === CardFooter) {
        return React.cloneElement(child as React.ReactElement<any>, { 
          isCollapsed 
        });
      }
    }
    return child;
  });

  return (
    <div className={clsx(cardStyles.container, !modal && 'mb-6', className)}>
      {childrenWithProps}
    </div>
  );
};

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card; 
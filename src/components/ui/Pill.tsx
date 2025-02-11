import React from 'react';
import BaseStyledContainer, { BaseStyledContainerProps } from './BaseStyledContainer';
import * as FaIcons from 'react-icons/fa';

type PillProps = Omit<BaseStyledContainerProps<'span'>, 'as' | 'elementProps' | 'iconRight'> & {
  icon?: React.ReactNode | string;
  iconColor?: string;
  onClick?: () => void;
};

const Pill: React.FC<PillProps> = ({
  children,
  onClick,
  icon,
  iconColor,
  bgColor = 'bg-gray-700',
  ...baseProps
}) => {
  // Convert string icon to component if needed
  const iconElement = React.useMemo(() => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      // @ts-ignore - FaIcons will have the icon as a property
      const IconComponent = FaIcons[icon as keyof typeof FaIcons];
      return IconComponent ? <IconComponent /> : null;
    }
    return icon;
  }, [icon]);

  return (
    <BaseStyledContainer<'span'>
      {...baseProps}
      as="span"
      elementProps={{
        onClick
      }}
      iconLeft={iconElement}
      iconColor={iconColor}
      bgColor={bgColor}
    >
      {children}
    </BaseStyledContainer>
  );
};

export default Pill; 
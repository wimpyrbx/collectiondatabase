import React from 'react';
import BaseStyledContainer, { BaseStyledContainerProps } from './BaseStyledContainer';

type PillProps = Omit<BaseStyledContainerProps<'span'>, 'as' | 'elementProps' | 'iconRight'> & {
  icon?: React.ReactNode;
  onClick?: () => void;
};

const Pill: React.FC<PillProps> = ({
  children,
  onClick,
  icon,
  ...baseProps
}) => {
  return (
    <BaseStyledContainer<'span'>
      {...baseProps}
      as="span"
      elementProps={{
        onClick
      }}
      iconLeft={icon}
    >
      {children}
    </BaseStyledContainer>
  );
};

export default Pill; 
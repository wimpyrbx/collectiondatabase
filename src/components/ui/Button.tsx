import React from 'react';
import BaseStyledContainer, { BaseStyledContainerProps } from './BaseStyledContainer';

type ButtonProps = Omit<BaseStyledContainerProps<'button'>, 'as' | 'elementProps'> & 
  React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type,
  disabled,
  bgColor,
  hoverBgColor,
  ...baseProps
}) => {
  return (
    <BaseStyledContainer<'button'>
      {...baseProps}
      bgColor={bgColor}
      hoverBgColor={hoverBgColor}
      as="button"
      elementProps={{
        onClick,
        type,
        disabled
      }}
    >
      {children}
    </BaseStyledContainer>
  );
};

export default Button; 
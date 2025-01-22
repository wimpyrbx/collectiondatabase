import React, { useState } from 'react';
import { getBorderColorFromBg, getHoverBgColor, getTextColorForBg, getIconColorForBg } from '@/utils/colorUtils';
import { TooltipProps } from '@/utils/tooltip';
import { Tooltip } from '@/components/tooltip/Tooltip';

type ValidElements = 'div' | 'span' | 'button' | 'a';

export interface BaseStyledContainerProps<T extends ValidElements = 'div'> {
  /* The text or content to display */
  children?: React.ReactNode;
  /* Background color classes (e.g. 'bg-blue-600') */
  bgColor?: string;
  /* Hover background color classes (e.g. 'hover:bg-blue-500'). If not provided, will lighten bgColor */
  hoverBgColor?: boolean;
  /* Whether to show a border */
  border?: boolean;
  /* Border color classes (e.g. 'border-blue-500'). If not provided but border=true, will use lighter variant of bgColor */
  borderColor?: string;
  /* Border opacity (0-100) */
  borderOpacity?: number;
  /* Hover effect: 'none', 'scale', 'pulse' */
  hoverEffect?: 'none' | 'scale' | 'pulse';
  /* Text color classes (e.g. 'text-white') */
  textColor?: string;
  /* Optional icon to show on the left side */
  iconLeft?: React.ReactNode;
  /* Optional icon to show on the right side */
  iconRight?: React.ReactNode;
  /* Icon color classes (e.g., 'text-white') */
  iconColor?: string;
  /* Element size: 'xs', 'sm', 'md', or 'lg' */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /* Shadow classes (e.g., 'shadow-md') */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /* Shadow color classes (e.g., 'shadow-blue-500') */
  shadowColor?: string;
  /* Rounded classes (default: 'rounded-md') */
  rounded?: string;
  /* Optional extra className overrides */
  className?: string;
  /* HTML element to render ('button' | 'span' | etc) */
  as?: T;
  /* Additional props to pass to the element */
  elementProps?: JSX.IntrinsicElements[T];
  /* Tooltip configuration */
  tooltip?: TooltipProps;
}

export const sizeClasses = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base'
};

export const hoverEffectClasses = {
  none: '',
  scale: 'hover:scale-125 transform transition-transform duration-0',
  pulse: 'hover:animate-pulse'
};

export const BaseStyledContainer = <T extends ValidElements = 'div'>({
  children,
  bgColor = 'bg-gray-700',
  border = true,
  borderColor,
  borderOpacity = 50,
  hoverEffect = 'none',
  textColor,
  iconLeft,
  iconRight,
  iconColor,
  size = 'xs',
  shadow = 'sm',
  shadowColor = 'shadow-gray-900',
  rounded = 'rounded-md',
  className = '',
  as,
  elementProps = {},
  tooltip
}: BaseStyledContainerProps<T>) => {
  const Element = (as || 'div') as keyof JSX.IntrinsicElements;
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = React.useRef<HTMLElement>(null);
  
  // If bgColor is *-500 or lower, use the textColor from getTextColorForBg else use the textColor prop
  const determinedTextColor = textColor || getTextColorForBg(bgColor);
  const determinedIconColor = iconColor || getIconColorForBg(bgColor);

  const combinedClassName = `
    inline-flex items-center justify-center gap-1
    ${Element === 'button' ? 'cursor-pointer' : 'cursor-default'}
    ${bgColor}
    ${border ? getBorderColorFromBg(bgColor, borderColor, borderOpacity) : ''}
    ${getHoverBgColor(bgColor)}
    ${determinedTextColor}
    ${sizeClasses[size]}
    ${rounded}
    ${hoverEffectClasses[hoverEffect]}
    focus:outline-none
    transition-all
    transition-colors
    ${shadow ? `${shadowColor} shadow-${shadow}` : ''}
    ${className}
  `;

  const content = (
    <>
      {iconLeft && (
        <span className={`${determinedIconColor} flex items-center`}>
          {iconLeft}
        </span>
      )}
      {children}
      {iconRight && (
        <span className={`${determinedIconColor} flex items-center`}>
          {iconRight}
        </span>
      )}
    </>
  );

  return (
    <>
      {React.createElement(
        Element,
        {
          ref: elementRef,
          className: combinedClassName,
          onMouseEnter: () => setIsOpen(true),
          onMouseLeave: () => setIsOpen(false),
          ...elementProps
        },
        content
      )}
      {tooltip && (
        <Tooltip
          {...tooltip}
          isOpen={isOpen}
          elementRef={elementRef}
        />
      )}
    </>
  );
};

export default BaseStyledContainer; 
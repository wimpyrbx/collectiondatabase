import React, { useState, useRef } from 'react';
import { Tooltip } from './Tooltip';
import { TooltipPlacement, TooltipStyle } from '@/utils/tooltip';

interface TooltipWrapperProps {
  children: React.ReactNode;
  content: React.ReactNode;
  placement?: TooltipPlacement;
  style?: TooltipStyle;
}

export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  children,
  content,
  placement = 'right',
  style = 'frost'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={elementRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className="inline-block"
    >
      {children}
      <Tooltip
        text={content}
        placement={placement}
        style={style}
        isOpen={isOpen}
        elementRef={elementRef}
      />
    </div>
  );
};

export default TooltipWrapper; 
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TooltipProps, tooltipStyles, TooltipSize, TooltipPlacement, TooltipStyle, DEFAULT_TOOLTIP_CONFIG } from '@/utils/tooltip';

interface TooltipComponentProps extends TooltipProps {
  size?: 'xs' | 'sm' | 'md';
  isOpen: boolean;
  elementRef: React.RefObject<HTMLElement>;
}

export const Tooltip: React.FC<TooltipComponentProps> = ({
  text,
  placement = DEFAULT_TOOLTIP_CONFIG.placement,
  style = DEFAULT_TOOLTIP_CONFIG.style,
  size = DEFAULT_TOOLTIP_CONFIG.size,
  icon,
  isOpen,
  elementRef
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (placement === 'follow-cursor') {
      const handleMouseMove = (event: MouseEvent) => {
        setPosition({ x: event.clientX, y: event.clientY });
      };

      if (isOpen) {
        window.addEventListener('mousemove', handleMouseMove);
      } else {
        window.removeEventListener('mousemove', handleMouseMove);
      }

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    } else if (isOpen && elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      setPosition({ 
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  }, [isOpen, placement, elementRef]);

  const calculatePosition = () => {
    if (!position || (!elementRef.current && placement !== 'follow-cursor')) return {};
    
    if (placement === 'follow-cursor') {
      return { 
        left: position.x,
        top: position.y - 35,
        transform: 'translateX(-50%)'
      };
    }

    const rect = elementRef.current!.getBoundingClientRect();
    const offset = 8;

    switch (placement) {
      case 'top':
        return { 
          left: rect.left + rect.width / 2,
          top: rect.top - offset,
          transform: 'translate(-50%, -100%)'
        };
      case 'top-start':
        return { 
          left: rect.left,
          top: rect.top - offset,
          transform: 'translateY(-100%)'
        };
      case 'top-end':
        return { 
          left: rect.right,
          top: rect.top - offset,
          transform: 'translate(-100%, -100%)'
        };
      case 'left':
        return { 
          left: rect.left - offset,
          top: rect.top + rect.height / 2,
          transform: 'translate(-100%, -50%)'
        };
      case 'right':
        return { 
          left: rect.right + offset,
          top: rect.top + rect.height / 2,
          transform: 'translateY(-50%)'
        };
      default:
        return { 
          left: rect.left + rect.width / 2,
          top: rect.top - offset,
          transform: 'translate(-50%, -100%)'
        };
    }
  };

  if (!isOpen || !text) return null;

  return createPortal(
    <div
      style={calculatePosition()}
      className={`
        fixed z-50
        text-${size}
        ${tooltipStyles[style]}
        ${icon ? 'flex items-center gap-2' : ''}
      `}
    >
      {icon && (
        <span className="flex items-center">
          {icon}
        </span>
      )}
      {text}
    </div>,
    document.body
  );
}; 
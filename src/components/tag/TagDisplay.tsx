import React, { useRef, useState } from 'react';
import { TagInfo } from '@/types/tags';
import * as Icons from 'react-icons/fa';
import Pill from '@/components/ui/Pill';
import { Tooltip } from '@/components/tooltip/Tooltip';
import clsx from 'clsx';

interface TagDisplayProps {
  tag: TagInfo;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const getColorClasses = (color: string) => {
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    gray: {
      text: 'text-gray-400',
      bg: 'bg-gray-500/20',
      border: 'border-gray-400/20'
    },
    red: {
      text: 'text-red-400',
      bg: 'bg-red-500/20',
      border: 'border-red-400/20'
    },
    green: {
      text: 'text-green-400',
      bg: 'bg-green-500/20',
      border: 'border-green-400/20'
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500/20',
      border: 'border-blue-400/20'
    },
    yellow: {
      text: 'text-yellow-400',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-400/20'
    },
    purple: {
      text: 'text-purple-400',
      bg: 'bg-purple-500/20',
      border: 'border-purple-400/20'
    },
    pink: {
      text: 'text-pink-400',
      bg: 'bg-pink-500/20',
      border: 'border-pink-400/20'
    },
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/20',
      border: 'border-indigo-400/20'
    },
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-400/20'
    },
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/20',
      border: 'border-orange-400/20'
    }
  };

  return colorMap[color] || colorMap.gray;
};

export const TagDisplay: React.FC<TagDisplayProps> = ({ 
  tag, 
  size = 'xs',
  className 
}) => {
  const { display_type, display_value, name, color: tagColor = 'gray', description } = tag;
  const elementRef = useRef<HTMLSpanElement>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  };

  const iconSizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6'
  };

  const colorClasses = getColorClasses(tagColor || 'gray');

  if (display_type === 'icon') {
    const IconComponent = (Icons as any)[display_value];
    if (!IconComponent) return null;

    return (
      <span 
        ref={elementRef}
        className={clsx(
          'inline-flex items-center cursor-help',
          sizeClasses[size],
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <IconComponent className={clsx(
          iconSizeClasses[size],
          colorClasses.text
        )} />
        <Tooltip
          text={description || name}
          style="minimal"
          size={size}
          isOpen={isTooltipVisible}
          elementRef={elementRef}
        />
      </span>
    );
  }

  if (display_type === 'image') {
    return (
      <span 
        ref={elementRef}
        className={clsx(
          'inline-flex items-center cursor-help',
          sizeClasses[size],
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <img 
          src={display_value} 
          alt={name} 
          className={clsx(
            iconSizeClasses[size],
            'object-contain'
          )} 
        />
        <Tooltip
          text={description || name}
          style="minimal"
          size={size}
          isOpen={isTooltipVisible}
          elementRef={elementRef}
        />
      </span>
    );
  }

  // Default to text display with pill
  return (
    <span
      ref={elementRef}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <Pill
        bgColor={colorClasses.bg}
        textColor={colorClasses.text}
        size={size}
        className={clsx(
          className,
          'cursor-help'
        )}
      >
        {display_value || name}
      </Pill>
      <Tooltip
        text={description || name}
        style="minimal"
        size={size}
        isOpen={isTooltipVisible}
        elementRef={elementRef}
      />
    </span>
  );
}; 
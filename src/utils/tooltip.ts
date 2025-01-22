import { ReactNode } from 'react';

export const TooltipStyle = {
  minimal: 'minimal',
  frost: 'frost',
  depth: 'depth',
  outline: 'outline',
  soft: 'soft'
} as const;

export const TooltipSize = {
  small: 'xs',
  medium: 'sm',
  large: 'md'
} as const;

export const TooltipPlacement = {
  'follow-cursor': 'follow-cursor',
  top: 'top',
  'top-start': 'top-start',
  'top-end': 'top-end',
  left: 'left',
  right: 'right'
} as const;

export type TooltipStyle = typeof TooltipStyle[keyof typeof TooltipStyle];
export type TooltipPlacement = typeof TooltipPlacement[keyof typeof TooltipPlacement];

// Base tooltip configuration
export const DEFAULT_TOOLTIP_CONFIG = {
  style: TooltipStyle.soft,
  placement: TooltipPlacement.top,
  size: TooltipSize.small
} as const;

export interface TooltipProps {
  text: string | ReactNode;
  placement?: TooltipPlacement;
  style?: TooltipStyle;
  icon?: ReactNode;
}

export const tooltipStyles: Record<TooltipStyle, string> = {
  // Clean, minimal design
  minimal: `
    bg-gray-900
    text-gray-200
    shadow-lg shadow-black/20
    rounded-lg
    px-4 py-2
    ring-1 ring-white/5
  `,

  // Modern frost effect
  frost: `
    bg-white/8
    text-white/90
    shadow-xl shadow-black/10
    rounded-xl
    px-4 py-2.5
    backdrop-blur-sm
    border border-white/10
  `,

  // Sophisticated depth
  depth: `
    bg-zinc-900
    text-zinc-100
    shadow-[0_4px_12px_rgba(0,0,0,0.3)]
    rounded-lg
    px-4 py-2.5
    ring-1 ring-zinc-800
    border-t border-zinc-800/50
  `,

  // Refined outline
  outline: `
    bg-black/90
    text-gray-200
    border border-white/10
    shadow-sm
    rounded-lg
    px-4 py-2
    backdrop-blur-[2px]
  `,

  // Soft, muted style
  soft: `
    bg-gray-100/90
    text-gray-800
    border-2 border-gray-400/70
    shadow-lg shadow-black/25
    rounded-lg
    px-4 py-2
  `
}; 
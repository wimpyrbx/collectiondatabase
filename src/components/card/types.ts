import { ReactNode } from 'react';

export interface CardTheme {
  header?: {
    background?: string;
    icon?: string;
  };
}

export interface CardCompositionProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: React.ReactNode;
  isCollapsed?: boolean;
}

export interface CardFooterProps {
  children: React.ReactNode;
  isCollapsed?: boolean;
}

export interface CardHeaderProps {
  title: string;
  collapsible?: boolean;
  startCollapsed?: boolean;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  bgColor?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  textColor?: string;
} 
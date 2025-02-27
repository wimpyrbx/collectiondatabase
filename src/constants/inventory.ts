import React from 'react';
import { FaStore, FaArchive, FaShoppingCart, FaCheck } from 'react-icons/fa';

export interface StatusStyle {
  bgColor: string;
  textColor: string;
  borderColor?: string;
  hoverBgColor?: string;
}

export interface StatusConfig {
  label: string;
  value: string;
  shortcut: string;
  styles: StatusStyle;
  iconType: 'store' | 'archive' | 'cart' | 'check';
}

export const INVENTORY_STATUSES: Record<string, StatusConfig> = {
  Normal: {
    label: 'Normal',
    value: 'Normal',
    shortcut: 'N',
    iconType: 'store',
    styles: {
      bgColor: 'bg-gray-700',
      textColor: 'text-gray-100',
      borderColor: 'border-gray-600',
      hoverBgColor: 'hover:bg-gray-600'
    }
  },
  Collection: {
    label: 'Collection',
    value: 'Collection',
    shortcut: 'C',
    iconType: 'archive',
    styles: {
      bgColor: 'bg-orange-800',
      textColor: 'text-orange-100',
      borderColor: 'border-orange-700',
      hoverBgColor: 'hover:bg-orange-700'
    }
  },
  'For Sale': {
    label: 'For Sale',
    value: 'For Sale',
    shortcut: 'F',
    iconType: 'cart',
    styles: {
      bgColor: 'bg-green-800',
      textColor: 'text-green-100',
      borderColor: 'border-green-700',
      hoverBgColor: 'hover:bg-green-700'
    }
  }
};

// Helper function to get status styles
export const getStatusStyles = (status: string): StatusStyle => {
  return INVENTORY_STATUSES[status]?.styles || {
    bgColor: 'bg-gray-800',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-700',
    hoverBgColor: 'hover:bg-gray-700'
  };
};

// Helper function to get status config
export const getStatusConfig = (status: string): StatusConfig | undefined => {
  return INVENTORY_STATUSES[status];
};

// Add this interface to define what we need to check
export interface DeletableCheck {
  purchase_id?: number | null;
  sale_id?: number | null;
}

// Update the helper function
export const canDeleteInventory = (item: DeletableCheck | null): boolean => {
  if (!item) return false;
  return !item.purchase_id && !item.sale_id;
}; 
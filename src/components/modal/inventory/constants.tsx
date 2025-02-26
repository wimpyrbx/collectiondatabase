import React from 'react';
import { FaStore, FaArchive, FaShoppingCart } from 'react-icons/fa';

export interface StatusOption {
  status: string;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
  bgColor: string;
  textColor: string;
}

// Status options configuration
export const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'Normal',
    label: 'Normal',
    icon: <FaStore />,
    shortcut: 'N',
    bgColor: 'bg-gray-700',
    textColor: 'text-gray-100',
  },
  {
    status: 'Collection',
    label: 'Collection',
    icon: <FaArchive />,
    shortcut: 'C',
    bgColor: 'bg-orange-800',
    textColor: 'text-white',
  },
  {
    status: 'For Sale',
    label: 'For Sale',
    icon: <FaShoppingCart />,
    shortcut: 'F',
    bgColor: 'bg-green-800',
    textColor: 'text-green-100',
  }
]; 
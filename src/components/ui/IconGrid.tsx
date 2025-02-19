import React from 'react';
import { 
  FaFile, FaFolder, FaImage, FaVideo, FaMusic, 
  FaGamepad, FaTag, FaBox, FaBoxOpen, FaArchive,
  FaShoppingCart, FaDollarSign, FaStar, FaHeart, 
  FaCheck, FaTimes, FaExclamation, FaQuestion,
  FaInfo, FaCog, FaUser, FaUsers, FaGlobe, FaHome,
  FaBookmark
} from 'react-icons/fa';
import clsx from 'clsx';

export interface IconOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

interface IconGridProps {
  options: IconOption[];
  value?: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  bgColor?: string;
  iconColor?: string;
  selectedBgColor?: string;
  selectedIconColor?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12'
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

export const IconGrid: React.FC<IconGridProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  bgColor = 'bg-gray-800',
  iconColor = 'text-gray-300',
  selectedBgColor = 'bg-blue-600',
  selectedIconColor = 'text-white',
  className
}) => {
  return (
    <div 
      className={clsx(
        'grid grid-cols-5 gap-2',
        className
      )}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex items-center justify-center rounded-lg transition-all',
              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500',
              sizeClasses[size],
              isSelected ? selectedBgColor : bgColor,
              isSelected ? selectedIconColor : iconColor
            )}
            title={option.label}
          >
            <div className={iconSizeClasses[size]}>
              {option.icon}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Curated list of common icons
export const getCommonIconOptions = (): IconOption[] => {
  const icons = {
    FaFile,
    FaFolder,
    FaImage,
    FaVideo,
    FaMusic,
    FaGamepad,
    FaTag,
    FaBox,
    FaBoxOpen,
    FaArchive,
    FaShoppingCart,
    FaDollarSign,
    FaStar,
    FaHeart,
    FaCheck,
    FaTimes,
    FaExclamation,
    FaQuestion,
    FaInfo,
    FaCog,
    FaUser,
    FaUsers,
    FaGlobe,
    FaHome,
    FaBookmark
  };

  return Object.entries(icons).map(([key, Icon]) => ({
    value: key,
    label: key.replace('Fa', ''),
    icon: <Icon />
  }));
}; 
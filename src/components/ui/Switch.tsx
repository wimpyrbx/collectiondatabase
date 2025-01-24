import React from 'react';
import { FaCheck } from 'react-icons/fa';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string | React.ReactNode;
  shape?: 'round' | 'square' | 'boxed';
  size?: 'xs' | 'sm' | 'md';
}

const Switch: React.FC<Props> = ({ 
  checked, 
  onChange, 
  disabled = false, 
  label,
  shape = 'round',
  size = 'md'
}) => {
  // Size mappings
  const sizeClasses = {
    xs: {
      container: 'w-8 h-4',
      toggle: 'w-3 h-3',
      translate: 'translate-x-4',
      spacing: 'left-0.5 top-0.5',
      label: 'text-xs',
      boxed: 'px-2 py-1',
      icon: 'w-3 h-3'
    },
    sm: {
      container: 'w-10 h-6',
      toggle: 'w-4 h-4',
      translate: 'translate-x-4',
      spacing: 'left-1 top-1',
      label: 'text-sm',
      boxed: 'px-3 py-2',
      icon: 'w-4 h-4'
    },
    md: {
      container: 'w-14 h-8',
      toggle: 'w-6 h-6',
      translate: 'translate-x-6',
      spacing: 'left-1 top-1',
      label: 'text-sm',
      boxed: 'px-4 py-3',
      icon: 'w-5 h-5'
    }
  };

  const currentSize = sizeClasses[size];
  const roundedClass = shape === 'round' ? 'rounded-full' : 'rounded-md';

  if (shape === 'boxed') {
    return (
      <div 
        onClick={() => !disabled && onChange(!checked)}
        className={`
          cursor-pointer border rounded-md transition-all duration-200
          ${currentSize.boxed}
          ${disabled ? 'opacity-50 cursor-not-allowed border-gray-600' : checked ? 'border-green-500' : 'border-gray-600'}
          ${checked ? 'bg-green-600/20 hover:bg-green-600/30' : 'bg-gray-600/20 hover:bg-gray-600/30'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex-grow">
            {label && (
              <span className={`font-medium ${disabled ? 'text-gray-600' : 'text-gray-300'} ${currentSize.label}`}>
                {label}
              </span>
            )}
          </div>
          <FaCheck 
            className={`
              ${currentSize.icon} ml-3 transition-colors duration-200
              ${checked ? 'text-green-400' : 'text-gray-600'}
            `}
          />
        </div>
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <label className="flex items-center cursor-pointer">
      {label && <span className={`font-medium ${disabled ? 'text-gray-600' : 'text-gray-300'} mr-2 ${currentSize.label}`}>{label}</span>}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div
          className={`block ${currentSize.container} ${roundedClass} ${
            disabled ? 'opacity-25 cursor-not-allowed' : ''
          } ${checked ? 'bg-green-600' : 'bg-gray-600'}`}
        />
        <div
          className={`absolute ${currentSize.spacing} ${disabled ? 'bg-gray-500' : 'bg-white'} ${currentSize.toggle} ${roundedClass} transition-transform duration-200 ease-in-out transform ${
            checked ? currentSize.translate : 'translate-x-0'
          }`}
        />
      </div>
    </label>
  );
};

export default Switch; 
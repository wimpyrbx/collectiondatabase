import React from 'react';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  shape?: 'round' | 'square';
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
      label: 'text-xs'
    },
    sm: {
      container: 'w-10 h-6',
      toggle: 'w-4 h-4',
      translate: 'translate-x-4',
      spacing: 'left-1 top-1',
      label: 'text-sm'
    },
    md: {
      container: 'w-14 h-8',
      toggle: 'w-6 h-6',
      translate: 'translate-x-6',
      spacing: 'left-1 top-1',
      label: 'text-sm'
    }
  };

  const currentSize = sizeClasses[size];
  const roundedClass = shape === 'round' ? 'rounded-full' : 'rounded-md';

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
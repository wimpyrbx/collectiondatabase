import React from 'react';
import { FiAlertCircle, FiInfo, } from 'react-icons/fi';
import type { IconType } from 'react-icons';

interface Props {
  errors: string[];
  icon?: IconType;
  iconColor?: string;
  header?: string;
  bgColor?: string;
  borderColor?: string;
  textColor?: string;
}

const DisplayError: React.FC<Props> = ({
  errors,
  icon: Icon = FiAlertCircle,
  iconColor = 'text-red-400',
  header = 'Please fix the following errors:',
  bgColor = 'bg-red-900/50',
  borderColor = 'border-red-700',
  textColor = 'text-red-300'
}) => {
  if (errors.length === 0) return null;

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <div className={`flex items-center gap-2 ${iconColor} mb-2`}>
        <Icon />
        <span className="font-medium">{header}</span>
      </div>
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={index} className={`text-sm ${textColor}`}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

export default DisplayError; 
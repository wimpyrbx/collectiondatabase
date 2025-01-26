import React from 'react';
import type { IconType } from 'react-icons';

interface FormElementLabelProps {
  /** The label text to display */
  label?: string;
  /** 
   * The icon to display next to the label.
   * Can be either:
   * 1. A React-Icons component (e.g., <FaTag />)
   * 2. Any other React node that renders an icon
   */
  labelIcon?: React.ReactNode;
  /** The color class for the icon (e.g., 'text-blue-400') */
  labelIconColor?: string;
  /** The text size class (e.g., 'sm', 'md') */
  textSize?: string;
  /** Whether the label should appear disabled */
  disabled?: boolean;
}

export const FormElementLabel: React.FC<FormElementLabelProps> = ({
  label,
  labelIcon,
  labelIconColor = '',
  textSize = 'xs',
  disabled = false
}) => {

  if (!label) return null;

  return (
    <label className={`flex items-center text-${textSize} ${disabled ? 'text-gray-600' : 'text-gray-300'}`}>
      {labelIcon && (
        <span className={`mr-2 mb-0.5 ${disabled ? 'opacity-50' : ''} ${labelIconColor}`}>
          {labelIcon}
        </span>
      )}
      {label}
    </label>
  );
};

export default FormElementLabel; 
import React from 'react';

export type TextSize = 'xs' | 'sm' | 'md';
export type RoundedSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelPosition = 'left' | 'above';
export type ElementType = 'input' | 'select' | 'textarea' | 'listsingle' | 'listmultiple';

export type SelectItem = {
  value: string | number;
  label: string;
};

export type TextValue = string | number;
export type SelectionValue = TextValue | TextValue[];

export interface FormElementProps {
  elementType: ElementType;
  initialValue?: TextValue;
  onValueChange?: (value: SelectionValue) => void;
  options?: SelectItem[];
  selectedOptions?: TextValue | TextValue[];
  bgColor?: string;
  textSize?: TextSize;
  textColor?: string;
  width?: string;
  padding?: string;
  margin?: string;
  rounded?: RoundedSize;
  placeholder?: string;
  rows?: number;
  multiple?: boolean;
  label?: string;
  labelPosition?: LabelPosition;
  labelIcon?: React.ReactNode;
  labelIconColor?: string;
  showClearButton?: boolean;
  disabled?: boolean;
  numericOnly?: boolean;
}

const defaultStyles = {
  bgColor: 'bg-gray-900',
  textColor: 'text-gray-200',
  textSize: 'xs' as TextSize,
  width: 'w-full',
  padding: 'p-2',
  margin: 'mt-1',
  rounded: 'md' as RoundedSize,
  labelPosition: 'left' as LabelPosition,
};

const FormElement: React.FC<FormElementProps> = ({
  elementType,
  initialValue = '',
  onValueChange,
  options = [],
  multiple = false,
  bgColor = defaultStyles.bgColor,
  textSize = defaultStyles.textSize,
  textColor = defaultStyles.textColor,
  width = defaultStyles.width,
  padding = defaultStyles.padding,
  margin = defaultStyles.margin,
  rounded = defaultStyles.rounded,
  placeholder,
  rows = 3,
  label,
  labelPosition = defaultStyles.labelPosition,
  labelIcon,
  labelIconColor = 'text-gray-400',
  showClearButton = true,
  disabled = false,
  numericOnly = false,
  selectedOptions = [],
}) => {
  const baseClasses = `${bgColor} ${textColor} ${disabled ? 'opacity-50' : ''} text-${textSize} ${width} ${padding} ${margin} ${
    rounded === 'none' ? '' : `rounded-${rounded}`
  } border border-gray-700 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder-gray-500/50`;

  const handleChange = (value: SelectionValue) => {
    onValueChange?.(value);
  };

  const handleNumericInput = (value: string) => {
    if (value === '' || (/^-?\d*\.?\d*$/.test(value) && !isNaN(Number(value)))) {
      handleChange(value === '' ? '' : Number(value));
    }
  };

  const renderElement = () => {
    const commonProps = {
      className: `${baseClasses}`,
      placeholder,
      disabled,
    };

    switch (elementType) {
      case 'listsingle':
      case 'listmultiple':
        return (
          <select
            {...commonProps}
            multiple={elementType === 'listmultiple'}
            size={options.length}
            className={`${commonProps.className} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [appearance:none] [&::-ms-expand]:hidden !overflow-auto bg-[length:0] !bg-none`}
            onChange={(e) => handleChange(elementType === 'listmultiple' 
              ? Array.from(e.target.selectedOptions, option => option.value)
              : e.target.value
            )}
            value={Array.isArray(selectedOptions) 
              ? selectedOptions.map(String) 
              : selectedOptions ? String(selectedOptions) 
              : ''}
          >
            {options.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            value={initialValue}
            onChange={(e) => handleChange(e.target.value)}
            rows={rows}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            type="text"
            value={initialValue}
            onChange={(e) => numericOnly ? handleNumericInput(e.target.value) : handleChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className={`relative ${labelPosition === 'above' ? 'flex flex-col' : 'flex items-center'}`}>
      {label && (
        <label className={`flex items-center text-${textSize} ${disabled ? 'text-gray-500' : 'text-gray-400'} ${
          labelPosition === 'above' ? 'mb-1' : 'mr-2'
        }`}>
          {labelIcon && (
            <span className={`mr-1 ${disabled ? 'opacity-50' : ''} ${labelIconColor}`}>
              {labelIcon}
            </span>
          )}
          {label}
        </label>
      )}
      {renderElement()}
      {showClearButton && ['input', 'textarea'].includes(elementType) && initialValue && !disabled && (
        <button
          type="button"
          onClick={() => handleChange('')}
          className="absolute text-sm -right-1 top-0.5 flex justify-center text-red-600 hover:text-red-300 bg-transparent"
        >
          X
        </button>
      )}
    </div>
  );
};

export default FormElement; 
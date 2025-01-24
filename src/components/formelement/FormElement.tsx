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
  maxLength?: number;
  truncate?: boolean;
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
  maxLength,
  selectedOptions = [],
  truncate = false,
}) => {
  const elementRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const baseClasses = `${bgColor} ${textColor} ${disabled ? 'opacity-50' : ''} text-${textSize} ${width} ${padding} ${margin} ${
    rounded === 'none' ? '' : `rounded-${rounded}`
  } border border-gray-700 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder-gray-500/50`;

  const handleChange = (value: SelectionValue) => {
    onValueChange?.(value);
  };

  const handleClear = () => {
    handleChange('');
    // Focus the input/textarea after clearing
    elementRef.current?.focus();
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
            size={4}
            className={`${commonProps.className} [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [appearance:none] [&::-ms-expand]:hidden !overflow-auto bg-[length:0] !bg-none ${truncate ? 'truncate' : ''} [&>option[data-selected]]:bg-blue-900 [&>option[data-selected]]:text-white`}
            onChange={(e) => handleChange(elementType === 'listmultiple' 
              ? Array.from(e.target.selectedOptions, option => option.value)
              : e.target.value
            )}
            value={Array.isArray(selectedOptions) 
              ? selectedOptions.map(String) 
              : selectedOptions ? String(selectedOptions) 
              : ''}
            style={{ height: '6rem' }} /* Force consistent height */
          >
            {options.length === 0 && (
              <option value="" disabled>{placeholder || 'No options available'}</option>
            )}
            {options.map(item => {
              const isSelected = Array.isArray(selectedOptions) 
                ? selectedOptions.includes(item.value)
                : selectedOptions === item.value;
              return (
                <option 
                  key={item.value} 
                  value={item.value} 
                  className={truncate ? 'truncate' : ''}
                  data-selected={isSelected || undefined}
                >
                  {item.label}
                </option>
              );
            })}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            ref={elementRef as React.RefObject<HTMLTextAreaElement>}
            value={initialValue}
            onChange={(e) => handleChange(e.target.value)}
            rows={rows}
            maxLength={maxLength}
          />
        );

      default:
        return (
          <input
            {...commonProps}
            ref={elementRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={initialValue}
            onChange={(e) => numericOnly ? handleNumericInput(e.target.value) : handleChange(e.target.value)}
            maxLength={maxLength}
          />
        );
    }
  };

  return (
    <div className={`relative ${labelPosition === 'above' ? 'flex flex-col' : 'flex items-center'}`}>
      {label && (
        <label className={`flex items-center text-${textSize} ${disabled ? 'text-gray-600' : 'text-gray-300'}`}>
          {labelIcon && (
            <span className={`mr-2 mb-0.5 ${disabled ? 'opacity-50' : ''} ${labelIconColor}`}>
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
          onClick={handleClear}
          className="absolute text-sm -right-2 mt-[14px] flex justify-center text-red-600/50 hover:text-red-500 bg-transparent"
        >
          X
        </button>
      )}
    </div>
  );
};

export default FormElement; 
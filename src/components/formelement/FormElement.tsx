import React, { useState } from 'react';

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
  // Remove value and onChange, we'll manage internally
  initialValue?: TextValue;
  onValueChange?: (value: SelectionValue) => void; // Optional callback
  // For select/list
  options?: SelectItem[];
  selectedOptions?: TextValue | TextValue[];
  // Styling props
  bgColor?: string;
  textSize?: TextSize;
  textColor?: string;
  width?: string;
  padding?: string;
  margin?: string;
  rounded?: RoundedSize;
  // Element specific props
  placeholder?: string;
  rows?: number;
  multiple?: boolean;
  // Label props
  label?: string;
  labelPosition?: LabelPosition;
  labelIcon?: React.ReactNode;
  labelIconColor?: string;
  // Additional features
  showClearButton?: boolean; // Optional, defaults to true
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
  // Styling props with defaults
  bgColor = defaultStyles.bgColor,
  textSize = defaultStyles.textSize,
  textColor = defaultStyles.textColor,
  width = defaultStyles.width,
  padding = defaultStyles.padding,
  margin = defaultStyles.margin,
  rounded = defaultStyles.rounded,
  // Element specific props
  placeholder,
  rows = 3,
  // Label props
  label,
  labelPosition = defaultStyles.labelPosition,
  labelIcon,
  labelIconColor = 'text-gray-400',
  // Additional features
  showClearButton = true,
  disabled = false,
  numericOnly = false,
  selectedOptions = [],
}) => {
  const [value, setValue] = useState<SelectionValue>(initialValue);
  const [selectedValues, setSelectedValues] = useState<TextValue[]>(() => {
    if (multiple || elementType === 'listmultiple') {
      return Array.isArray(selectedOptions) ? selectedOptions : selectedOptions ? [selectedOptions] : [];
    } else if (selectedOptions) {
      return Array.isArray(selectedOptions) ? [selectedOptions[0]] : [selectedOptions];
    }
    return [];
  });
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleChange = (newValue: SelectionValue) => {
    setValue(newValue);
    if (multiple) {
      setSelectedValues(Array.isArray(newValue) ? newValue : []);
    }
    onValueChange?.(newValue);
  };

  const handleClear = () => {
    const emptyValue = multiple ? [] : '';
    setValue(emptyValue);
    setSelectedValues([]);
    onValueChange?.(emptyValue);
    if (elementType === 'input' && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const baseClasses = `${bgColor} ${textColor} ${disabled ? 'opacity-50' : ''} text-${textSize} ${width} ${padding} ${margin} ${
    rounded === 'none' ? '' : `rounded-${rounded}`
  } border border-gray-700 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder-gray-500/50`;

  const renderLabel = () => {
    if (!label) return null;
    return (
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
    );
  };

  const renderClearButton = () => {
    // Only show clear button for input and textarea
    if (!showClearButton || disabled || (elementType !== 'input' && elementType !== 'textarea')) return null;

    const hasContent = Boolean(value);
    if (!hasContent) return null;

    return (
      <button
        type="button"
        onClick={handleClear}
        className="absolute text-sm -right-1 top-0.5 flex justify-center text-red-600 hover:text-red-300 bg-transparent"
      >
        X
      </button>
    );
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (elementType === 'listmultiple') {
      const newSelectedValues = Array.from(e.target.selectedOptions, option => option.value);
      setSelectedValues(newSelectedValues);
      handleChange(newSelectedValues);
    } else if (elementType === 'listsingle') {
      const newValue = e.target.value;
      setSelectedValues([newValue]);
      handleChange(newValue);
    }
  };

  const handleNumericInput = (value: string) => {
    // Handle empty input
    if (value === '') {
      handleChange('');
      return;
    }

    // Allow only valid numbers (including decimals and negative)
    const isValidNumber = /^-?\d*\.?\d*$/.test(value);
    if (isValidNumber && !isNaN(Number(value))) {
      handleChange(Number(value));
    }
  };

  const renderElement = () => {
    const commonProps = {
      className: `${baseClasses} ${showClearButton && (elementType === 'input' || elementType === 'textarea') ? 'pr-8' : ''}`,
      placeholder,
      disabled,
    };

    switch (elementType) {
      case 'listsingle':
      case 'listmultiple':
        const isMultiple = elementType === 'listmultiple';
        const selectValue = isMultiple 
          ? selectedValues.map(String) 
          : selectedValues.length > 0 ? String(selectedValues[0]) : '';

        return (
          <select
            {...commonProps}
            multiple={isMultiple}
            size={options.length}
            className={`${commonProps.className}
                [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [appearance:none] [&::-ms-expand]:hidden !overflow-auto bg-[length:0] !bg-none
            `}
            onChange={handleSelectChange}
            value={selectValue}
          >
            {options.map((item) => (
              <option key={item.value} value={String(item.value)}>
                {item.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            value={String(value ?? '')}
            onChange={(e) => handleChange(e.target.value)}
            rows={rows}
          />
        );
      case 'select':
        return (
          <select
            {...commonProps}
            className={`${commonProps.className}`}
            onChange={(e) => handleChange(e.target.value)}
            value={String(value)}
          >
            <option value="">Select...</option>
            {options.map((item) => (
              <option key={item.value} value={String(item.value)}>
                {item.label}
              </option>
            ))}
          </select>
        );
      default:
        return (
          <input
            ref={inputRef}
            type={numericOnly ? "text" : "text"}
            className={`${baseClasses} ${showClearButton && (elementType === 'input' || elementType === 'textarea') ? 'pr-8' : ''}`}
            value={String(value ?? '')}
            onChange={(e) => {
              if (numericOnly) {
                handleNumericInput(e.target.value);
              } else {
                handleChange(e.target.value);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={`flex ${labelPosition === 'above' ? 'flex-col' : 'items-center'}`}>
      {renderLabel()}
      <div className={`relative ${width}`}>
        {renderElement()}
        {renderClearButton()}
      </div>
    </div>
  );
};

export default FormElement; 
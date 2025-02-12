import React from 'react';
import * as FaIcons from 'react-icons/fa';
import FormElementLabel from './FormElementLabel';
import clsx from 'clsx';
import { FaTimes } from 'react-icons/fa';
import Pill from '../ui/Pill';

export type TextSize = 'xs' | 'sm' | 'md';
export type RoundedSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type LabelPosition = 'left' | 'above' | 'below';
export type ElementType = 'input' | 'select' | 'textarea' | 'listsingle' | 'listmultiple';

export type SelectItem = {
  value: string | number;
  label: string;
};

export type TextValue = string | number;
export type SelectionValue = TextValue | TextValue[];

export interface For3mElementProps {
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
  labelIcon?: React.ReactNode | string;
  labelIconColor?: string;
  showClearButton?: boolean;
  disabled?: boolean;
  numericOnly?: boolean;
  maxLength?: number;
  truncate?: boolean;
  className?: string;
  disableTransitionOpacity?: boolean;
  showResetPill?: boolean;
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

export const FormElement: React.FC<For3mElementProps> = ({
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
  className,
  disableTransitionOpacity = false,
  showResetPill = false
}) => {
  const elementRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const baseClasses = `${bgColor} ${textColor} ${disabled ? 'opacity-50' : ''} text-${textSize} ${width} ${padding} ${margin} ${
    rounded === 'none' ? '' : `rounded-${rounded}`
  } border border-gray-700 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder-gray-500/50`;

  // Helper function to check if the value is empty
  const isEmpty = (value: any) => {
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return false;
    return !value;
  };

  // Check if the current value is empty
  const isValueEmpty = elementType === 'listsingle' || elementType === 'listmultiple'
    ? isEmpty(selectedOptions)
    : isEmpty(initialValue);

  // Combine base classes with transition opacity if enabled
  const combinedClassName = clsx(
    className,
    !disableTransitionOpacity && 'transition-opacity duration-200',
    !disableTransitionOpacity && isValueEmpty && 'opacity-50 focus-within:opacity-100 hover:opacity-100'
  );

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

  const icon = React.useMemo(() => {
    if (!labelIcon) return null;
    if (typeof labelIcon === 'string') {
      // @ts-ignore - FaIcons will have the icon as a property
      const IconComponent = FaIcons[labelIcon];
      return IconComponent ? <IconComponent /> : null;
    }
    return labelIcon;
  }, [labelIcon]);

  const renderLabel = () => {
    if (!label) return null;
    return (
      <FormElementLabel
        label={label}
        labelIcon={icon}
        labelIconColor={labelIconColor}
        textSize={textSize}
        disabled={disabled}
      />
    );
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
            {options.map((item: SelectItem) => {
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

  const hasSelectedValues = elementType === 'listsingle' || elementType === 'listmultiple' 
    ? Array.isArray(selectedOptions) 
      ? selectedOptions.length > 0 
      : !!selectedOptions
    : false;

  return (
    <div className={combinedClassName}>
      {showResetPill && hasSelectedValues && ['listsingle', 'listmultiple'].includes(elementType) ? (
        <div className="grid grid-cols-2 w-full">
          <div className="col-span-1">
            {labelPosition === 'above' && renderLabel()}
          </div>
          <div className="col-span-1 flex justify-end">
            <Pill
              onClick={() => handleChange(elementType === 'listmultiple' ? [] : '')}
              icon={<FaTimes />}
              iconColor="text-gray-300"
              bgColor="bg-red-700/50"
              hoverEffect="pulse"
              size="xs"
              className="transition-colors !pt-0 !pb-0 !mt-0 !mb-0 !border-none"
            >
              Reset
            </Pill>
          </div>
        </div>
      ) : (
        <>
          {labelPosition === 'above' && renderLabel()}
        </>
      )}

      <div className={clsx(
        'flex relative',
        labelPosition === 'left' ? 'flex-row items-center gap-3' : 'flex-col gap-2'
      )}>
        {labelPosition === 'left' && renderLabel()}
        <div className="w-full">
          {renderElement()}
        </div>
        {showClearButton && ['input', 'textarea'].includes(elementType) && initialValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute text-sm right-[-6px] -translate-y-[-1px] flex justify-center text-red-600 hover:text-red-500 bg-transparent"
          >
            X
          </button>
        )}
      </div>
      {labelPosition === 'below' && renderLabel()}
    </div>
  );
};

export default FormElement; 
import React, { useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  options?: SelectOption[];
  containerClassName?: string;
  children?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      required = false,
      options,
      disabled = false,
      containerClassName = '',
      className = '',
      id: customId,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = customId || `select-${generatedId}`;
    const helperId = `${selectId}-helper`;
    const errorId = `${selectId}-error`;

    const hasError = Boolean(errorMessage);

    const describedBy = [
      hasError ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`space-y-1.5 w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-medium text-[#172B2D] select-none"
          >
            {label}
            {required && <span className="text-[#C83C3C] ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            aria-required={required}
            className={`w-full h-10 px-3 pr-8 bg-white text-sm text-[#172B2D] border rounded-lg transition-colors duration-150 vn-focus-ring cursor-pointer disabled:bg-[#F6F8F8] disabled:text-[#5F6F71] disabled:cursor-not-allowed appearance-none ${
              hasError
                ? 'border-[#C83C3C] focus:border-[#C83C3C]'
                : 'border-[#DDE5E5] hover:border-[#CBD5D5] focus:border-[#176B72]'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom Chevron Arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#5F6F71]">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {hasError && (
          <p id={errorId} className="text-xs text-[#C83C3C] font-medium">
            {errorMessage}
          </p>
        )}

        {!hasError && helperText && (
          <p id={helperId} className="text-xs text-[#5F6F71]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

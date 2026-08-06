import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      required = false,
      leftIcon,
      rightIcon,
      disabled = false,
      readOnly = false,
      containerClassName = '',
      className = '',
      id: customId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = customId || `input-${generatedId}`;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

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
            htmlFor={inputId}
            className="block text-xs sm:text-xs font-medium text-[#172B2D] select-none"
          >
            {label}
            {required && <span className="text-[#C83C3C] ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#5F6F71] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            readOnly={readOnly}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            aria-required={required}
            className={`w-full h-10 px-3 bg-white text-sm text-[#172B2D] placeholder-[#596A6C] border rounded-lg transition-colors duration-150 vn-focus-ring disabled:bg-[#F6F8F8] disabled:text-[#5F6F71] disabled:cursor-not-allowed read-only:bg-[#F6F8F8] read-only:cursor-default ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              hasError
                ? 'border-[#C83C3C] focus:border-[#C83C3C] focus:ring-[#C83C3C]'
                : 'border-[#DDE5E5] hover:border-[#CBD5D5] focus:border-[#176B72]'
            } ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-[#5F6F71] pointer-events-none flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {hasError && (
          <p id={errorId} className="text-xs text-[#C83C3C] font-medium flex items-center gap-1">
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

Input.displayName = 'Input';

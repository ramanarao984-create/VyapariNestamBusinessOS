import React, { useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      required = false,
      disabled = false,
      readOnly = false,
      containerClassName = '',
      className = '',
      id: customId,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = customId || `textarea-${generatedId}`;
    const helperId = `${textareaId}-helper`;
    const errorId = `${textareaId}-error`;

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
            htmlFor={textareaId}
            className="block text-xs font-medium text-[#172B2D] select-none"
          >
            {label}
            {required && <span className="text-[#C83C3C] ml-1" aria-hidden="true">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={hasError}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          className={`w-full p-3 bg-white text-sm text-[#172B2D] placeholder-[#596A6C] border rounded-lg transition-colors duration-150 vn-focus-ring disabled:bg-[#F6F8F8] disabled:text-[#5F6F71] disabled:cursor-not-allowed read-only:bg-[#F6F8F8] read-only:cursor-default ${
            hasError
              ? 'border-[#C83C3C] focus:border-[#C83C3C]'
              : 'border-[#DDE5E5] hover:border-[#CBD5D5] focus:border-[#176B72]'
          } ${className}`}
          {...props}
        />

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

Textarea.displayName = 'Textarea';

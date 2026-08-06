import React, { useId } from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string | React.ReactNode;
  description?: string | React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id: customId,
  name,
}) => {
  const generatedId = useId();
  const toggleId = customId || `toggle-${generatedId}`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      {(label || description) && (
        <div className="space-y-0.5 select-none">
          {label && (
            <label
              htmlFor={toggleId}
              className={`block text-sm font-medium ${
                disabled ? 'text-[#5F6F71]' : 'text-[#172B2D]'
              } cursor-pointer`}
              onClick={() => !disabled && onChange(!checked)}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-[#5F6F71] leading-relaxed">{description}</p>
          )}
        </div>
      )}

      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        name={name}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out vn-focus-ring disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-[#176B72]' : 'bg-[#DDE5E5]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-3xs ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};

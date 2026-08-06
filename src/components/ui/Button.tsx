import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'compact' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'default',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className = '',
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isLoading;

    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 ease-in-out select-none vn-focus-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-[#176B72] text-white hover:bg-[#10555C] active:bg-[#0C4349] disabled:hover:bg-[#176B72] shadow-3xs',
      secondary:
        'bg-white text-[#172B2D] border border-[#DDE5E5] hover:bg-[#F6F8F8] hover:border-[#CBD5D5] active:bg-[#EAEAEA] shadow-3xs',
      ghost:
        'bg-transparent text-[#172B2D] hover:bg-[#F6F8F8] active:bg-[#EAEAEA]',
      destructive:
        'bg-[#C83C3C] text-white hover:bg-[#A82E2E] active:bg-[#8A2424] disabled:hover:bg-[#C83C3C] shadow-3xs',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      compact: 'h-8 px-3 text-xs gap-1.5',
      default: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isButtonDisabled) {
        e.preventDefault();
        return;
      }
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isButtonDisabled}
        aria-disabled={isButtonDisabled}
        aria-busy={isLoading}
        onClick={handleClick}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0 flex items-center">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0 flex items-center">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

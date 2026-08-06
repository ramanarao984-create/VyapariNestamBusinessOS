import React from 'react';
import { Loader2 } from 'lucide-react';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type IconButtonSize = 'sm' | 'default' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  'aria-label': string; // Strictly required for accessibility
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      'aria-label': ariaLabel,
      variant = 'secondary',
      size = 'default',
      isLoading = false,
      disabled = false,
      className = '',
      onClick,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isLoading;

    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-colors duration-150 select-none vn-focus-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

    const variantStyles: Record<IconButtonVariant, string> = {
      primary:
        'bg-[#176B72] text-white hover:bg-[#10555C] active:bg-[#0C4349] disabled:hover:bg-[#176B72] shadow-3xs',
      secondary:
        'bg-white text-[#172B2D] border border-[#DDE5E5] hover:bg-[#F6F8F8] hover:border-[#CBD5D5] active:bg-[#EAEAEA] shadow-3xs',
      ghost:
        'bg-transparent text-[#5F6F71] hover:text-[#172B2D] hover:bg-[#F6F8F8] active:bg-[#EAEAEA]',
      destructive:
        'bg-[#C83C3C] text-white hover:bg-[#A82E2E] active:bg-[#8A2424] disabled:hover:bg-[#C83C3C] shadow-3xs',
    };

    const sizeStyles: Record<IconButtonSize, string> = {
      sm: 'h-8 w-8 text-xs',
      default: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
    };

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
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={handleClick}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          <span className="shrink-0 flex items-center justify-center">{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

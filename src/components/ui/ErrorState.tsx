import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  retryLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
  retryLabel = 'Try Again',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 bg-[#FDF2F2] border border-[#F8C4C4] rounded-xl flex flex-col items-center justify-center text-center ${className}`}
      role="alert"
    >
      <div className="h-10 w-10 rounded-full bg-[#FCE8E8] text-[#C83C3C] flex items-center justify-center mb-3 shrink-0">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-[#8C1D1D] mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-[#8C1D1D]/90 max-w-md mb-4 leading-relaxed">
        {message}
      </p>

      {onRetry && (
        <Button
          variant="destructive"
          size="compact"
          onClick={onRetry}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};

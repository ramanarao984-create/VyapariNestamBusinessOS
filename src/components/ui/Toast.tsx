import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  type?: ToastType;
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
}) => {
  const config = {
    success: {
      bg: 'bg-[#EAF4E8]',
      border: 'border-[#BDE0B8]',
      text: 'text-[#135222]',
      icon: <CheckCircle2 className="h-5 w-5 text-[#135222] shrink-0" />,
    },
    error: {
      bg: 'bg-[#FDF2F2]',
      border: 'border-[#F8C4C4]',
      text: 'text-[#8C1D1D]',
      icon: <AlertCircle className="h-5 w-5 text-[#8C1D1D] shrink-0" />,
    },
    warning: {
      bg: 'bg-[#FEF3E2]',
      border: 'border-[#FADBA3]',
      text: 'text-[#7A4304]',
      icon: <AlertTriangle className="h-5 w-5 text-[#7A4304] shrink-0" />,
    },
    info: {
      bg: 'bg-[#EBF5FA]',
      border: 'border-[#B7E0F2]',
      text: 'text-[#124B63]',
      icon: <Info className="h-5 w-5 text-[#124B63] shrink-0" />,
    },
  };

  const currentConfig = config[type] || config.info;

  const isAssertive = type === 'error' || type === 'warning';

  return (
    <div
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
      className={`p-4 rounded-xl border shadow-md flex items-start justify-between gap-3 ${currentConfig.bg} ${currentConfig.border} ${currentConfig.text} ${className}`}
    >
      <div className="flex items-start gap-3">
        {currentConfig.icon}
        <div className="space-y-0.5">
          {title && <h4 className="text-sm font-semibold leading-snug">{title}</h4>}
          <p className="text-xs sm:text-sm font-medium leading-relaxed">{message}</p>
        </div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-black/5 transition-colors text-current shrink-0 vn-focus-ring cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

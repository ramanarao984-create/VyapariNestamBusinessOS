import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string | React.ReactNode;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    leftIcon?: React.ReactNode;
  };
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-dashed border-[#DDE5E5] rounded-xl ${className}`}
    >
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#F6F8F8] text-[#176B72] mb-4">
        {icon || <FolderOpen className="h-6 w-6" aria-hidden="true" />}
      </div>

      <h3 className="text-base font-semibold text-[#172B2D] mb-1">{title}</h3>

      {description && (
        <p className="text-xs sm:text-sm text-[#5F6F71] max-w-md mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <Button
          variant="primary"
          onClick={action.onClick}
          leftIcon={action.leftIcon}
        >
          {action.label}
        </Button>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumbs,
  className = '',
  badge,
}) => {
  return (
    <div className={`mb-6 space-y-2 ${className}`}>
      {breadcrumbs && <div className="mb-2 text-xs text-[#5F6F71]">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-[28px] font-bold text-[#172B2D] leading-tight tracking-tight">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {description && (
            <div className="text-sm text-[#5F6F71] leading-relaxed max-w-3xl">
              {description}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

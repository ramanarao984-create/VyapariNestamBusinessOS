import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  actionPosition?: 'right' | 'bottom';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  actions,
  className = '',
  actionPosition = 'right',
}) => {
  return (
    <div
      className={`flex flex-col ${
        actionPosition === 'right' ? 'sm:flex-row sm:items-center sm:justify-between' : ''
      } gap-3 mb-4 ${className}`}
    >
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-[#172B2D] leading-snug">
          {title}
        </h2>
        {description && (
          <div className="text-xs sm:text-sm text-[#5F6F71] mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, HelpCircle, Clock, Ban, Radio } from 'lucide-react';

export type StatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'unconfigured';

export interface StatusBadgeProps {
  status: StatusBadgeVariant;
  label?: string;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showIcon = true,
  className = '',
  size = 'default',
}) => {
  const config: Record<
    StatusBadgeVariant,
    {
      defaultLabel: string;
      styles: string;
      icon: React.ReactNode;
    }
  > = {
    success: {
      defaultLabel: 'Success',
      styles: 'bg-[#EAF4E8] text-[#135222] border border-[#BDE0B8]',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#135222]" />,
    },
    active: {
      defaultLabel: 'Active',
      styles: 'bg-[#EAF4E8] text-[#135222] border border-[#BDE0B8]',
      icon: <Radio className="h-3.5 w-3.5 shrink-0 text-[#135222]" />,
    },
    warning: {
      defaultLabel: 'Warning',
      styles: 'bg-[#FEF3E2] text-[#7A4304] border border-[#FADBA3]',
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#7A4304]" />,
    },
    pending: {
      defaultLabel: 'Pending',
      styles: 'bg-[#FEF3E2] text-[#7A4304] border border-[#FADBA3]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0 text-[#7A4304]" />,
    },
    error: {
      defaultLabel: 'Error',
      styles: 'bg-[#FDF2F2] text-[#8C1D1D] border border-[#F8C4C4]',
      icon: <AlertCircle className="h-3.5 w-3.5 shrink-0 text-[#8C1D1D]" />,
    },
    inactive: {
      defaultLabel: 'Inactive',
      styles: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]',
      icon: <Ban className="h-3.5 w-3.5 shrink-0 text-[#475569]" />,
    },
    info: {
      defaultLabel: 'Info',
      styles: 'bg-[#EBF5FA] text-[#124B63] border border-[#B7E0F2]',
      icon: <Info className="h-3.5 w-3.5 shrink-0 text-[#124B63]" />,
    },
    neutral: {
      defaultLabel: 'Neutral',
      styles: 'bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1]',
      icon: <HelpCircle className="h-3.5 w-3.5 shrink-0 text-[#334155]" />,
    },
    unconfigured: {
      defaultLabel: 'Not Configured',
      styles: 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] stroke-dashed',
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />,
    },
  };

  const { defaultLabel, styles, icon } = config[status] || config.neutral;
  const displayLabel = label || defaultLabel;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full select-none ${styles} ${sizeClasses} ${className}`}
    >
      {showIcon && icon}
      <span>{displayLabel}</span>
    </span>
  );
};

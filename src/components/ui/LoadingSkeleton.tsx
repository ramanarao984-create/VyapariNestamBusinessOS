import React from 'react';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'title' | 'card' | 'avatar' | 'button' | 'table-row';
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  count = 1,
}) => {
  const variantStyles = {
    text: 'h-4 w-full bg-[#E8EEEE] rounded',
    title: 'h-6 w-2/3 bg-[#E8EEEE] rounded-md',
    avatar: 'h-10 w-10 rounded-full bg-[#E8EEEE]',
    button: 'h-10 w-28 bg-[#E8EEEE] rounded-lg',
    card: 'h-32 w-full bg-[#E8EEEE] rounded-xl border border-[#DDE5E5]',
    'table-row': 'h-12 w-full bg-[#E8EEEE] rounded-lg',
  };

  const items = Array.from({ length: count });

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`animate-pulse ${variantStyles[variant]} ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

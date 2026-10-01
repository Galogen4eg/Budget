import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rectangular' 
}) => {
  const baseClasses = 'bg-[#EAE6DD]/50 dark:bg-white/5 animate-pulse';
  
  let variantClasses = '';
  if (variant === 'text') {
    variantClasses = 'h-3 w-5/6 rounded-sm';
  } else if (variant === 'circular') {
    variantClasses = 'rounded-full';
  } else {
    variantClasses = 'rounded-2xl';
  }

  return (
    <div 
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={{ animationDuration: '1.6s' }}
    />
  );
};

export const TransactionListSkeleton: React.FC = () => {
  return (
    <div className="space-y-3.5 w-full">
      {Array.from({ length: 3 }).map((_, i) => (
        <div 
          key={i} 
          className="p-3.5 rounded-2xl bg-white/40 dark:bg-[#1C1C1E]/40 border border-surface-border/40 dark:border-white/5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton variant="text" className="w-24 h-4.5" />
              <Skeleton variant="text" className="w-16 h-3" />
            </div>
          </div>
          <Skeleton className="w-16 h-7 rounded-xl" />
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-4 p-4 rounded-3xl bg-white/40 dark:bg-[#1C1C1E]/40 border border-surface-border/40 dark:border-white/5">
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="w-32 h-5" />
        <Skeleton variant="text" className="w-20 h-4" />
      </div>
      <div className="h-48 flex items-end gap-3 pt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-xl" 
            style={{ height: `${20 + (i * 12) % 70}%` }} 
          />
        ))}
      </div>
    </div>
  );
};

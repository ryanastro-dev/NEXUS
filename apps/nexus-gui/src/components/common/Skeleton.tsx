import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/60 dark:bg-slate-700/50 ${className}`}
      {...props}
    />
  );
}

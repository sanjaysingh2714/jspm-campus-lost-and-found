import React from 'react';
import { cn } from '../../lib/utils';
import { ItemStatus, ClaimStatus } from '../../types/database';
import { getItemStatusBadge, getClaimStatusBadge } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'teal' | 'navy' | 'amber' | 'rose' | 'emerald';
}

export const Badge: React.FC<BadgeProps> = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    outline: 'bg-transparent text-slate-700 border-slate-300',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    navy: 'bg-navy-50 text-navy-800 border-navy-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export const ItemStatusBadge: React.FC<{ status: ItemStatus; className?: string }> = ({ status, className }) => {
  const badgeInfo = getItemStatusBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shadow-xs',
        badgeInfo.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', badgeInfo.dot)} />
      {badgeInfo.label}
    </span>
  );
};

export const ClaimStatusBadge: React.FC<{ status: ClaimStatus; className?: string }> = ({ status, className }) => {
  const badgeInfo = getClaimStatusBadge(status);
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        badgeInfo.bg,
        className
      )}
    >
      {badgeInfo.label}
    </span>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

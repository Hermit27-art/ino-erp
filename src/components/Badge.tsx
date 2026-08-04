import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  error: 'bg-danger/10 text-danger border border-danger/20',
  neutral: 'bg-text-secondary/10 text-text-secondary border border-text-secondary/20',
};

export function Badge({ variant = 'neutral', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

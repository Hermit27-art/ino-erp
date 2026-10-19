import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary hover:bg-primary-hover text-white shadow-sm border border-transparent',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-white shadow-sm border border-transparent',
  outline: 'bg-white hover:bg-slate-50 text-primary border border-border shadow-sm',
  danger: 'bg-danger hover:bg-danger text-white shadow-sm border border-transparent',
  ghost: 'bg-transparent hover:bg-slate-100 text-secondary border border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-semibold transition-colors rounded-lg cursor-pointer
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

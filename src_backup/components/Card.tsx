import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  noShadow?: boolean;
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({ 
  children, 
  padding = 'md', 
  className = '', 
  noShadow = false,
  ...props 
}: CardProps) {
  return (
    <div 
      className={`bg-white border border-border rounded-card ${noShadow ? '' : 'shadow-sm'} ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

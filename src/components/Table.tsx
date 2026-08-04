import React from 'react';

export function Table({ children, className = '' }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto rounded-card border border-border bg-white">
      <table className={`w-full text-left border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children, className = '' }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-slate-50 sticky top-0 z-10 ${className}`}>
      {children}
    </thead>
  );
}

export function TBody({ children, className = '' }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-slate-100 ${className}`}>
      {children}
    </tbody>
  );
}

export function TR({ children, className = '' }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-slate-50 transition-colors even:bg-slate-50/50 ${className}`}>
      {children}
    </tr>
  );
}

export function TH({ children, className = '', isNumeric = false, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }) {
  return (
    <th 
      className={`px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wide border-b border-border ${isNumeric ? 'text-right' : 'text-left'} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TD({ children, className = '', isNumeric = false, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { isNumeric?: boolean }) {
  return (
    <td 
      className={`px-4 py-3 text-sm text-primary ${isNumeric ? 'text-right font-mono tabular-nums' : 'text-left'} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}

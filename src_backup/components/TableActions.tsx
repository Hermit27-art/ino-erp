import React from 'react';
import { Eye, Edit3, Trash2 } from 'lucide-react';
import { Button } from './Button';

interface TableActionsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TableActions({ onView, onEdit, onDelete }: TableActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onView && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onView} 
          className="text-info hover:text-info hover:bg-blue-50 p-1.5 h-auto rounded"
          title="Detail"
        >
          <Eye size={16} />
        </Button>
      )}
      {onEdit && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onEdit} 
          className="text-secondary hover:text-primary hover:bg-slate-100 p-1.5 h-auto rounded"
          title="Edit"
        >
          <Edit3 size={16} />
        </Button>
      )}
      {onDelete && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDelete} 
          className="text-danger hover:text-danger hover:bg-danger/10 p-1.5 h-auto rounded"
          title="Hapus"
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  );
}

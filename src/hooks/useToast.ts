// src/hooks/useToast.ts
import { useState, useRef, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<number | null>(null);

  const triggerToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast({ message, type });
    timerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, triggerToast };
}

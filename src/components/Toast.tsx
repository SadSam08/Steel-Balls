import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success';
  text: string;
  onRetry?: () => void;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4">
      <div
        className={`p-3.5 rounded-2xl border shadow-2xl flex items-center justify-between gap-3 ${
          isError
            ? 'bg-slate-900/95 border-red-500/50 text-red-200'
            : 'bg-slate-900/95 border-emerald-500/50 text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isError ? (
            <AlertCircle size={20} className="text-red-400 shrink-0" />
          ) : (
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
          )}
          <p className="text-xs font-semibold">{toast.text}</p>
        </div>

        <div className="flex items-center gap-1">
          {toast.onRetry && (
            <button
              onClick={toast.onRetry}
              className="px-2 py-1 rounded-lg bg-red-500/20 text-red-300 font-bold text-[10px] hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

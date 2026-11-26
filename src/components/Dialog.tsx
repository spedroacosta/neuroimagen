import React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  onClose?: () => void;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/** Modal reutilizable: hoja inferior en móvil, ventana centrada en escritorio. */
export const Dialog: React.FC<DialogProps> = ({ title, onClose, size = 'md', children }) => (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4"
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <div
      className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${
        size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold leading-snug text-slate-900">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="overflow-y-auto px-5 py-5">{children}</div>
    </div>
  </div>
);

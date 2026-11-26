import React from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';

interface DialogProps {
  title: string;
  onClose?: () => void;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/** Modal de vidrio: entra desde abajo en móvil y aparece con escala en escritorio. */
export const Dialog: React.FC<DialogProps> = ({ title, onClose, size = 'md', children }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 backdrop-blur-sm sm:items-center sm:p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2 }}
    role="dialog"
    aria-modal="true"
    aria-label={title}
    onClick={(e) => {
      if (e.target === e.currentTarget && onClose) onClose();
    }}
  >
    <motion.div
      initial={{ y: 60, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 34 }}
      className={`glass flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px] ${
        size === 'lg' ? 'sm:max-w-xl' : 'sm:max-w-md'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-900/5 px-6 py-4">
        <h3 className="text-sm font-semibold leading-snug tracking-tight text-slate-900">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-900/5 text-slate-500 transition-colors hover:bg-slate-900/10 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="overflow-y-auto px-6 py-5">{children}</div>
    </motion.div>
  </motion.div>
);

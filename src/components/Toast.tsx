import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-slate-900 border-slate-800 text-white',
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-200">
      <div
        className={`flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl ${
          bgStyles[toast.type]
        }`}
      >
        {icons[toast.type]}
        <div className="flex-1 text-xs leading-relaxed font-medium">
          {toast.message}
        </div>
      </div>
    </div>
  );
};

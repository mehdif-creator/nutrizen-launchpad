import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useAutomationToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useAutomationToast must be used within AutomationToastProvider');
  return context;
};

export const AutomationToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border transition-all transform animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-200 text-red-800' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-200 text-blue-800' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

import React from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right duration-300 ${
            toast.type === 'success' 
              ? 'bg-white border-green-100 text-gray-800' 
              : 'bg-white border-red-100 text-gray-800'
          }`}
          role="alert"
        >
          {toast.type === 'success' ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <AlertCircle className="text-red-500" size={20} />
          )}
          <p className="text-sm font-medium">{toast.message}</p>
          <button 
            onClick={() => onDismiss(toast.id)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
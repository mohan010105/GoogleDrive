import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actions, maxWidth = 'max-w-md' }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidth} mx-4 overflow-hidden transform transition-all`}
      >
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
        {actions && (
          <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2 border-t">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
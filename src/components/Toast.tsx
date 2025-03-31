import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === 'success' 
    ? 'bg-green-900/50' 
    : type === 'error' 
    ? 'bg-red-900/50' 
    : 'bg-blue-900/50';

  const textColor = type === 'success'
    ? 'text-green-300'
    : type === 'error'
    ? 'text-red-300'
    : 'text-blue-300';

  return (
    <div
      className={`fixed bottom-4 right-4 flex items-center ${bgColor} ${textColor} px-4 py-2 rounded-lg shadow-lg`}
      role="alert"
    >
      <span className="mr-2">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/20 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

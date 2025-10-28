'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Toast from '@radix-ui/react-toast';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string | undefined;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, title, description };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const success = useCallback(
    (title: string, description?: string) => showToast('success', title, description),
    [showToast]
  );

  const error = useCallback(
    (title: string, description?: string) => showToast('error', title, description),
    [showToast]
  );

  const info = useCallback(
    (title: string, description?: string) => showToast('info', title, description),
    [showToast]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        <Toast.Viewport
          className="fixed top-4 right-4 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)] z-[100] outline-none"
          aria-live="polite"
          role="region"
          aria-label="Notifications"
        />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" aria-hidden="true" />;
    }
  };

  return (
    <Toast.Root
      className={`
        ${getToastStyles(toast.type)}
        rounded-lg border shadow-lg p-4
        data-[state=open]:animate-slideIn
        data-[state=closed]:animate-slideOut
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=cancel]:translate-x-0
        data-[swipe=cancel]:transition-transform
        data-[swipe=end]:animate-swipeOut
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
        <div className="flex-1 min-w-0">
          <Toast.Title className="text-sm font-semibold mb-1">
            {toast.title}
          </Toast.Title>
          {toast.description && (
            <Toast.Description className="text-sm opacity-90">
              {toast.description}
            </Toast.Description>
          )}
        </div>
        <Toast.Close
          className="flex-shrink-0 ml-2 rounded-md p-1 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-gray-400 transition-colors"
          aria-label="Close notification"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Toast.Close>
      </div>
    </Toast.Root>
  );
}

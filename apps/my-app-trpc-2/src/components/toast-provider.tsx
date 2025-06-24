// apps/my-app-trpc-2/src/components/toast-provider.tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface ToastContextType {
  showToast: (message: string, type?: "error" | "success" | "info") => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

const getToastStyles = (type: "error" | "success" | "info") => {
  switch (type) {
    case "error":
      return {
        container: "bg-panel border-red-600/40 text-red-400",
        icon: <AlertCircle size={16} className="text-red-400" />,
        title: "Error",
      };
    case "success":
      return {
        container: "bg-panel border-green-600/40 text-green-400",
        icon: <CheckCircle size={16} className="text-green-400" />,
        title: "Success",
      };
    case "info":
    default:
      return {
        container: "bg-panel border-blue-600/40 text-blue-400",
        icon: <Info size={16} className="text-blue-400" />,
        title: "Info",
      };
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "error" | "success" | "info" }>
  >([]);

  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "info"
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 5 seconds (except for errors)
    if (type !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type);

          return (
            <Toast.Root
              key={toast.id}
              className={`
                fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm w-full border
                data-[state=open]:animate-in data-[state=closed]:animate-out
                data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
                data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
                ${styles.container}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {styles.icon}
                  <div className="flex-1">
                    <Toast.Title className="font-medium text-sm text-foreground">
                      {styles.title}
                    </Toast.Title>
                    <Toast.Description className="text-sm mt-1 text-muted">
                      {toast.message}
                    </Toast.Description>
                  </div>
                </div>
                <Toast.Close
                  onClick={() => removeToast(toast.id)}
                  className="text-muted hover:text-accent ml-2 transition-colors"
                >
                  <X size={16} />
                </Toast.Close>
              </div>
            </Toast.Root>
          );
        })}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
};

// apps/my-app-trpc-2/src/components/toast-provider.tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import * as Toast from "@radix-ui/react-toast";
import { X } from "lucide-react";

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

    // Auto remove after 5 seconds
    if (type !== "error") {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    }

    // For error toasts, we don't auto-remove, allowing user to close manually
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            className={`
              fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm w-full
              data-[state=open]:animate-in data-[state=closed]:animate-out
              data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
              data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]
              ${
                toast.type === "error"
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : toast.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
              }
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Toast.Title className="font-medium text-sm">
                  {toast.type === "error" && "❌ Error"}
                  {toast.type === "success" && "✅ Success"}
                  {toast.type === "info" && "ℹ️ Info"}
                </Toast.Title>
                <Toast.Description className="text-sm mt-1">
                  {toast.message}
                </Toast.Description>
              </div>
              <Toast.Close
                onClick={() => removeToast(toast.id)}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                <X size={16} />
              </Toast.Close>
            </div>
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
};

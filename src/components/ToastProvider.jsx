"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const colors = {
    success: "bg-gray-900 dark:bg-slate-100 text-white dark:text-gray-900",
    error: "bg-rose-600 text-white",
    info: "bg-blue-600 text-white",
    warning: "bg-amber-500 text-white",
  };

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${colors[t.type]} animate-fade-in`}
            style={{ animation: "fadeInUp 0.2s ease" }}
          >
            <span>{icons[t.type]}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

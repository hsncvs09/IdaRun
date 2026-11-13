import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const STYLES = {
  success: {
    border: "border-pine-500/40 bg-obsidian-800/95",
    icon: <CheckCircle2 className="h-5 w-5 text-pine-400 shrink-0" />,
  },
  error: {
    border: "border-red-500/40 bg-obsidian-800/95",
    icon: <XCircle className="h-5 w-5 text-red-400 shrink-0" />,
  },
  warning: {
    border: "border-ember-500/40 bg-obsidian-800/95",
    icon: <AlertTriangle className="h-5 w-5 text-ember-400 shrink-0" />,
  },
  info: {
    border: "border-obsidian-600 bg-obsidian-800/95",
    icon: <Info className="h-5 w-5 text-sand-300 shrink-0" />,
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "info", durationMs = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (durationMs > 0) {
        setTimeout(() => removeToast(id), durationMs);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-[calc(1rem+env(safe-area-inset-top))] right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => {
          const style = STYLES[toast.type] || STYLES.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all ${style.border}`}
            >
              {style.icon}
              <p className="flex-1 text-sm font-medium text-sand-100 leading-snug">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-sand-400 hover:text-sand-100 transition-colors"
                aria-label="Bildirimi kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

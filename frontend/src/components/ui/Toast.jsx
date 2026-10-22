import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { id, tone, message }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ success: (m) => push("success", m), error: (m) => push("error", m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : AlertCircle;
          return (
            <div
              key={t.id}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-800 shadow-dropdown"
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} className={`mt-px shrink-0 ${t.tone === "success" ? "text-success" : "text-error"}`} />
              <span className="flex-1">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Toast Provider - Notification system
 */

import { createContext, useContext, type ParentProps } from "solid-js";
import { createStore } from "solid-js/store";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContext {
  toasts: Toast[];
  show: (options: { message: string; variant?: ToastVariant; duration?: number }) => void;
  dismiss: (id: string) => void;
  error: (err: unknown) => void;
}

const ToastCtx = createContext<ToastContext>();

let toastId = 0;

export function ToastProvider(props: ParentProps) {
  const [store, setStore] = createStore<{ toasts: Toast[] }>({ toasts: [] });

  const ctx: ToastContext = {
    get toasts() {
      return store.toasts;
    },
    show({ message, variant = "info", duration = 3000 }) {
      const id = `toast-${++toastId}`;
      const toast: Toast = { id, message, variant, duration };

      setStore("toasts", [...store.toasts, toast]);

      if (duration > 0) {
        setTimeout(() => ctx.dismiss(id), duration);
      }
    },
    dismiss(id: string) {
      setStore(
        "toasts",
        store.toasts.filter((t) => t.id !== id)
      );
    },
    error(err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.show({ message, variant: "error", duration: 5000 });
    },
  };

  return <ToastCtx.Provider value={ctx}>{props.children}</ToastCtx.Provider>;
}

export function useToast(): ToastContext {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

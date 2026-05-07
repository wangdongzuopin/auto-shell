"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

const toastVariants = cva(
  "pointer-events-auto relative flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl transition-all duration-300 animate-slide-up",
  {
    variants: {
      variant: {
        default: "bg-glass-bg-strong border-border/50 text-text-primary",
        success: "bg-glass-bg-strong border-forge-success/30 text-text-primary",
        error: "bg-glass-bg-strong border-danger/30 text-text-primary",
        warning: "bg-glass-bg-strong border-forge-warning/30 text-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: VariantProps<typeof toastVariants>["variant"]
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = String(++toastId)
    setToasts((prev) => [...prev, { ...toast, id }])
    const duration = toast.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast renderer */}
      <div className="fixed bottom-4 right-4 z-[150] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div key={toast.id} className={cn(toastVariants({ variant: toast.variant }))}>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-xs font-medium text-text-primary">{toast.title}</p>
              )}
              {toast.description && (
                <p className="text-[11px] text-text-secondary mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type Toast } from "@/hooks/use-toast";

const variantStyles: Record<NonNullable<Toast["variant"]>, string> = {
  default: "border-border bg-surface",
  success: "border-accent/30 bg-accent/10 text-accent",
  error: "border-destructive/30 bg-destructive/10 text-destructive",
  info: "border-info/30 bg-info/10 text-info",
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-md border px-4 py-3 text-xs shadow-overlay animate-in fade-in-0 slide-in-from-right-4",
            variantStyles[toast.variant || "default"]
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-foreground">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 text-muted-foreground">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

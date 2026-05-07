import * as React from "react"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

// Lightweight command palette input — uses native dialog for keyboard handling

interface CommandProps {
  className?: string
  children: React.ReactNode
}

function Command({ className, children }: CommandProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-glass-bg-strong backdrop-blur-2xl shadow-2xl",
        className
      )}
    >
      {children}
    </div>
  )
}

function CommandInput({
  value,
  onValueChange,
  placeholder = "输入命令...",
  autoFocus = true,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
      <Search className="h-4 w-4 text-text-tertiary shrink-0" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none",
          className
        )}
      />
    </div>
  )
}

function CommandList({ className, children }: CommandProps) {
  return (
    <div className={cn("overflow-y-auto p-2 max-h-64", className)}>
      {children}
    </div>
  )
}

function CommandGroup({
  heading,
  children,
  className,
}: { heading: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-1", className)}>
      <p className="px-2 py-1.5 text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
        {heading}
      </p>
      {children}
    </div>
  )
}

function CommandItem({
  onSelect,
  className,
  children,
}: {
  onSelect: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-2 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover/40 transition-all duration-150 text-left",
        className
      )}
    >
      {children}
    </button>
  )
}

function CommandShortcut({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-auto text-[10px] font-mono text-text-tertiary tracking-wider">
      {children}
    </kbd>
  )
}

export { Command, CommandInput, CommandList, CommandGroup, CommandItem, CommandShortcut }

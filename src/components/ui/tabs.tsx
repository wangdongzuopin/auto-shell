import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  const handleChange = React.useCallback(
    (v: string) => {
      if (!isControlled) setInternalValue(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
      {children}
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border/50 bg-bg-elevated/30 p-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs")
  const isActive = ctx.value === value

  return (
    <button
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        isActive
          ? "bg-accent-dev/10 text-accent-dev shadow-sm"
          : "text-text-tertiary hover:text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("TabsContent must be used within Tabs")
  if (ctx.value !== value) return null

  return (
    <div className={cn("animate-fade-in", className)} {...props}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

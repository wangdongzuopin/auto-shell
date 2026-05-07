import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  content: string
  children: React.ReactElement
  delayMs?: number
}

function Tooltip({ content, children, delayMs = 400 }: TooltipProps) {
  const [visible, setVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  const show = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 })
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs)
  }

  const hide = () => {
    clearTimeout(timeoutRef.current)
    setVisible(false)
  }

  React.useEffect(() => {
    return () => clearTimeout(timeoutRef.current)
  }, [])

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show as any,
        onBlur: hide as any,
      })}
      {visible && (
        <div
          className="fixed z-[200] px-2.5 py-1.5 rounded-lg border border-border bg-glass-bg-strong backdrop-blur-xl shadow-xl text-[11px] text-text-primary pointer-events-none animate-fade-in"
          style={{
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

export { Tooltip }

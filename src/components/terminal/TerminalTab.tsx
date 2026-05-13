import { useEffect, useRef, useCallback } from 'react'
import { Channel } from '@tauri-apps/api/core'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { terminalIpc } from '@/lib/ipc'
import { useTerminalStore, type TerminalTab } from '@/stores/terminalStore'

interface Props {
  tab: TerminalTab
}

export function TerminalTab({ tab }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const channelRef = useRef<Channel<{ type: string; data: unknown }> | null>(null)
  const spawnedRef = useRef(false)
  const setSessionId = useTerminalStore((s) => s.setSessionId)
  const setProcessState = useTerminalStore((s) => s.setProcessState)
  const setDimensions = useTerminalStore((s) => s.setDimensions)

  const handleResize = useCallback(() => {
    const fit = fitRef.current
    const xterm = xtermRef.current
    if (!fit || !xterm) return
    fit.fit()
    const { cols, rows } = xterm
    setDimensions(tab.id, cols, rows)
    if (tab.sessionId) {
      terminalIpc.resize(tab.sessionId, cols, rows).catch(() => {})
    }
  }, [tab.id, tab.sessionId, setDimensions])

  useEffect(() => {
    if (spawnedRef.current) return
    spawnedRef.current = true

    const container = containerRef.current
    if (!container) return

    const xterm = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5d6',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.open(container)

    xtermRef.current = xterm
    fitRef.current = fitAddon

    // Spawn the shell process
    const channel = new Channel<{ type: string; data: unknown }>()
    channelRef.current = channel

    channel.onmessage = (event) => {
      const { type, data } = event as { type: string; data: unknown }
      if (type === 'Output') {
        xterm.write(data as string)
      } else if (type === 'Exit') {
        setProcessState(tab.id, 'exited')
        xterm.writeln(`\r\n[Process exited with code ${data}]`)
      }
    }

    const cwd = tab.cwd || undefined

    terminalIpc
      .spawn(channel, cwd)
      .then((sessionId) => {
        setSessionId(tab.id, sessionId)
      })
      .catch((err) => {
        xterm.writeln(`[Failed to spawn terminal: ${err}]`)
      })

    // ResizeObserver to track container size
    const observer = new ResizeObserver(() => {
      handleResize()
    })
    observer.observe(container)

    // Initial fit after a short delay
    setTimeout(() => handleResize(), 100)

    // xterm input → backend stdin
    xterm.onData((data) => {
      const sid = useTerminalStore.getState().tabs.find((t) => t.id === tab.id)?.sessionId
      if (sid) {
        terminalIpc.write(sid, data).catch(() => {})
      }
    })

    return () => {
      observer.disconnect()
      const sid = useTerminalStore.getState().tabs.find((t) => t.id === tab.id)?.sessionId
      if (sid) {
        terminalIpc.kill(sid).catch(() => {})
      }
      xterm.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: 0 }}
    />
  )
}

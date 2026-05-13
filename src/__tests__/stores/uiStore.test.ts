import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      terminalOpen: false,
      commandPaletteOpen: false,
      toasts: [],
    })
  })

  it('toggles terminal', () => {
    useUIStore.getState().toggleTerminal()
    expect(useUIStore.getState().terminalOpen).toBe(true)
    useUIStore.getState().toggleTerminal()
    expect(useUIStore.getState().terminalOpen).toBe(false)
  })

  it('sets terminal open', () => {
    useUIStore.getState().setTerminalOpen(true)
    expect(useUIStore.getState().terminalOpen).toBe(true)
  })

  it('toggles command palette', () => {
    useUIStore.getState().toggleCommandPalette()
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)
  })

  it('adds and removes toasts', () => {
    const toast = { id: 't1', title: 'Test', description: 'desc', type: 'info' as const }
    useUIStore.getState().addToast(toast)
    expect(useUIStore.getState().toasts).toHaveLength(1)

    useUIStore.getState().removeToast('t1')
    expect(useUIStore.getState().toasts).toHaveLength(0)
  })
})

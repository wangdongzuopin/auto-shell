import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarOpen: true,
      rightPanelOpen: false,
      rightPanelView: 'plan',
      terminalOpen: false,
      commandPaletteOpen: false,
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

  it('toggles right panel', () => {
    useUIStore.getState().toggleRightPanel()
    expect(useUIStore.getState().rightPanelOpen).toBe(true)
  })

  it('sets right panel view', () => {
    useUIStore.getState().setRightPanelView('artifacts')
    expect(useUIStore.getState().rightPanelView).toBe('artifacts')
  })

  it('toggles sidebar', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })
})

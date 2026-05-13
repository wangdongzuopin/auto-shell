import { describe, it, expect, beforeEach } from 'vitest'
import { useTerminalStore } from '@/stores/terminalStore'

describe('terminalStore', () => {
  beforeEach(() => {
    useTerminalStore.setState({ tabs: [], activeTabId: null })
  })

  it('adds a tab with default values', () => {
    const id = useTerminalStore.getState().addTab()
    const state = useTerminalStore.getState()

    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(id)
    expect(state.tabs[0].processState).toBe('running')
    expect(state.tabs[0].cols).toBe(80)
    expect(state.tabs[0].rows).toBe(24)
    expect(state.tabs[0].sessionId).toBeNull()
  })

  it('adds multiple tabs with unique IDs', () => {
    const id1 = useTerminalStore.getState().addTab()
    const id2 = useTerminalStore.getState().addTab()
    const state = useTerminalStore.getState()

    expect(state.tabs).toHaveLength(2)
    expect(id1).not.toBe(id2)
    expect(state.activeTabId).toBe(id2)
  })

  it('removes a tab and activates previous', () => {
    const id1 = useTerminalStore.getState().addTab()
    const id2 = useTerminalStore.getState().addTab()
    useTerminalStore.getState().removeTab(id2)

    const state = useTerminalStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.activeTabId).toBe(id1)
  })

  it('removes last tab sets activeTabId to null', () => {
    const id = useTerminalStore.getState().addTab()
    useTerminalStore.getState().removeTab(id)

    const state = useTerminalStore.getState()
    expect(state.tabs).toHaveLength(0)
    expect(state.activeTabId).toBeNull()
  })

  it('sets active tab', () => {
    const id1 = useTerminalStore.getState().addTab()
    const id2 = useTerminalStore.getState().addTab()
    useTerminalStore.getState().setActiveTab(id1)

    expect(useTerminalStore.getState().activeTabId).toBe(id1)
  })

  it('updates sessionId for a tab', () => {
    const id = useTerminalStore.getState().addTab()
    useTerminalStore.getState().setSessionId(id, 'session-123')

    const tab = useTerminalStore.getState().tabs.find((t) => t.id === id)
    expect(tab?.sessionId).toBe('session-123')
  })

  it('updates process state', () => {
    const id = useTerminalStore.getState().addTab()
    useTerminalStore.getState().setProcessState(id, 'exited')

    const tab = useTerminalStore.getState().tabs.find((t) => t.id === id)
    expect(tab?.processState).toBe('exited')
  })

  it('updates dimensions', () => {
    const id = useTerminalStore.getState().addTab()
    useTerminalStore.getState().setDimensions(id, 120, 40)

    const tab = useTerminalStore.getState().tabs.find((t) => t.id === id)
    expect(tab?.cols).toBe(120)
    expect(tab?.rows).toBe(40)
  })
})

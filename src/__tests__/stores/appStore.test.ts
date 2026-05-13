import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/stores/appStore'

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      role: 'developer',
      theme: 'dark',
      sidebarOpen: true,
      mainView: 'chat',
      roleSwitchPending: false,
      requestedRole: null,
    })
  })

  it('sets role', () => {
    useAppStore.getState().setRole('product')
    expect(useAppStore.getState().role).toBe('product')
  })

  it('sets theme', () => {
    useAppStore.getState().setTheme('light')
    expect(useAppStore.getState().theme).toBe('light')
  })

  it('toggles sidebar', () => {
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(false)
    useAppStore.getState().toggleSidebar()
    expect(useAppStore.getState().sidebarOpen).toBe(true)
  })

  it('sets main view', () => {
    useAppStore.getState().setMainView('settings')
    expect(useAppStore.getState().mainView).toBe('settings')
  })

  it('requests role switch', () => {
    useAppStore.getState().requestRoleSwitch()
    const state = useAppStore.getState()
    expect(state.roleSwitchPending).toBe(true)
    expect(state.requestedRole).toBe('product')
  })

  it('confirms role switch', () => {
    useAppStore.getState().requestRoleSwitch()
    useAppStore.getState().confirmRoleSwitch()
    const state = useAppStore.getState()
    expect(state.role).toBe('product')
    expect(state.roleSwitchPending).toBe(false)
    expect(state.requestedRole).toBeNull()
  })

  it('cancels role switch', () => {
    useAppStore.getState().requestRoleSwitch()
    useAppStore.getState().cancelRoleSwitch()
    const state = useAppStore.getState()
    expect(state.role).toBe('developer')
    expect(state.roleSwitchPending).toBe(false)
    expect(state.requestedRole).toBeNull()
  })
})

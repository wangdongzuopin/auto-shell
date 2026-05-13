import { create } from 'zustand'
import { mcpIpc } from '@/lib/ipc'
import type { McpServerConfig, McpServerInfo, McpTool } from '@/types/commands'

interface McpState {
  servers: McpServerInfo[]
  loading: boolean
  error: string | null

  loadServers: () => Promise<void>
  reconnectAll: () => Promise<void>
  addServer: (config: McpServerConfig) => Promise<McpServerInfo | null>
  removeServer: (serverId: string) => Promise<void>
  startServer: (serverId: string) => Promise<void>
  stopServer: (serverId: string) => Promise<void>
  getActiveTools: () => McpTool[]
}

export const useMcpStore = create<McpState>((set, get) => ({
  servers: [],
  loading: false,
  error: null,

  loadServers: async () => {
    set({ loading: true, error: null })
    try {
      const servers = await mcpIpc.listServers()
      set({ servers, loading: false })
    } catch (e: any) {
      set({ error: e?.message || String(e), loading: false })
    }
  },

  reconnectAll: async () => {
    set({ loading: true, error: null })
    try {
      const servers = await mcpIpc.reconnectAll()
      set({ servers, loading: false })
    } catch (e: any) {
      set({ error: e?.message || String(e), loading: false })
    }
  },

  addServer: async (config) => {
    set({ error: null })
    try {
      const info = await mcpIpc.addServer(config)
      set((s) => ({ servers: [...s.servers, info] }))
      return info
    } catch (e: any) {
      set({ error: e?.message || String(e) })
      return null
    }
  },

  removeServer: async (serverId) => {
    set({ error: null })
    try {
      await mcpIpc.removeServer(serverId)
      set((s) => ({ servers: s.servers.filter((x) => x.config.id !== serverId) }))
    } catch (e: any) {
      set({ error: e?.message || String(e) })
    }
  },

  startServer: async (serverId) => {
    set({ error: null })
    try {
      const info = await mcpIpc.startServer(serverId)
      set((s) => ({
        servers: s.servers.map((x) => (x.config.id === serverId ? info : x)),
      }))
    } catch (e: any) {
      set({ error: e?.message || String(e) })
    }
  },

  stopServer: async (serverId) => {
    set({ error: null })
    try {
      await mcpIpc.stopServer(serverId)
      set((s) => ({
        servers: s.servers.map((x) =>
          x.config.id === serverId ? { ...x, status: 'Disconnected' as const } : x
        ),
      }))
    } catch (e: any) {
      set({ error: e?.message || String(e) })
    }
  },

  getActiveTools: () => {
    return get()
      .servers.filter((s) => s.status === 'Connected')
      .flatMap((s) => s.tools)
  },
}))

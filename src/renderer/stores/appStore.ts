import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PermissionMode } from '../../shared/types';

interface AppState {
  sidebarCollapsed: boolean;
  activeMenu: string;
  permissionMode: PermissionMode;
  permissionEnabled: boolean;

  toggleSidebar: () => void;
  setActiveMenu: (menu: string) => void;
  setPermissionMode: (mode: PermissionMode) => void;
  togglePermission: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeMenu: 'chat',
      permissionMode: 'default',
      permissionEnabled: true,

      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),

      setActiveMenu: (menu) => set({ activeMenu: menu }),

      setPermissionMode: (mode) => set({ permissionMode: mode }),

      togglePermission: () => set((state) => ({
        permissionEnabled: !state.permissionEnabled
      })),
    }),
    {
      name: 'app-storage',
    }
  )
);

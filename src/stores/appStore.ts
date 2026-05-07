import { create } from "zustand";

export type AppRole = "developer" | "product";
export type ThemeMode = "dark" | "light";
export type MainView = "chat" | "settings";

interface AppState {
  role: AppRole;
  theme: ThemeMode;
  sidebarOpen: boolean;
  mainView: MainView;
  pendingRole: AppRole | null;
  isTransitioning: boolean;

  setRole: (role: AppRole) => void;
  toggleRole: () => void;
  requestRoleSwitch: () => void;
  confirmRoleSwitch: () => void;
  cancelRoleSwitch: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMainView: (view: MainView) => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: "developer",
  theme: "dark",
  sidebarOpen: true,
  mainView: "chat",
  pendingRole: null,
  isTransitioning: false,

  setRole: (role) => set({ role }),
  toggleRole: () =>
    set((state) => ({
      role: state.role === "developer" ? "product" : "developer",
    })),
  requestRoleSwitch: () =>
    set((state) => ({
      pendingRole: state.role === "developer" ? "product" : "developer",
    })),
  confirmRoleSwitch: () =>
    set((state) => ({
      isTransitioning: true,
      role: state.role === "developer" ? "product" : "developer",
    })),
  cancelRoleSwitch: () =>
    set({ pendingRole: null }),
  setTheme: (theme) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    set({ theme });
  },
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMainView: (view) => set({ mainView: view }),
}));

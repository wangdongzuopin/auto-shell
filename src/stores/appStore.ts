import { create } from "zustand";
import { settingsIpc } from "@/lib/ipc";

export type AppRole = "developer" | "product";
export type ThemeMode = "dark" | "light";
export type MainView = "chat" | "workflow" | "settings";

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
  completeOnboarding: (role: AppRole, theme: ThemeMode) => Promise<void>;
}

function applyThemeClass(theme: ThemeMode) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
}

function persist(key: string, value: string) {
  settingsIpc.set(key, value).catch(() => {});
}

export const useAppStore = create<AppState>((set) => ({
  role: "developer",
  theme: "dark",
  sidebarOpen: true,
  mainView: "chat",
  pendingRole: null,
  isTransitioning: false,

  setRole: (role) => {
    set({ role });
    persist("app_role", role);
  },
  toggleRole: () =>
    set((state) => {
      const next = state.role === "developer" ? "product" : "developer";
      persist("app_role", next);
      return { role: next };
    }),
  requestRoleSwitch: () =>
    set((state) => ({
      pendingRole: state.role === "developer" ? "product" : "developer",
    })),
  confirmRoleSwitch: () =>
    set((state) => {
      const next = state.role === "developer" ? "product" : "developer";
      persist("app_role", next);
      return { isTransitioning: true, role: next };
    }),
  cancelRoleSwitch: () =>
    set({ pendingRole: null }),
  setTheme: (theme) => {
    applyThemeClass(theme);
    set({ theme });
    persist("app_theme", theme);
  },
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      applyThemeClass(next);
      persist("app_theme", next);
      return { theme: next };
    }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMainView: (view) => set({ mainView: view }),
  completeOnboarding: async (role, theme) => {
    applyThemeClass(theme);
    set({ role, theme });
    await settingsIpc.set("app_role", role);
    await settingsIpc.set("app_theme", theme);
    await settingsIpc.set("onboarding_completed", "true");
  },
}));

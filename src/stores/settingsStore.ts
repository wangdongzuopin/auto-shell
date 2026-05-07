import { create } from "zustand";
import { settingsIpc } from "@/lib/ipc";

export type AIProvider =
  | "deepseek"
  | "zhipu"
  | "kimi"
  | "minimax"
  | "doubao"
  | "qwen"
  | "stepfun"
  | "siliconflow";

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
}

export interface AppSettings {
  ai: AISettings;
  language: "zh" | "en";
}

const SETTINGS_KEY = "app_settings";

const DEFAULTS: Record<AIProvider, Omit<AISettings, "apiKey" | "temperature">> = {
  deepseek:    { provider: "deepseek",    baseUrl: "https://api.deepseek.com/v1",              model: "deepseek-chat" },
  zhipu:       { provider: "zhipu",       baseUrl: "https://open.bigmodel.cn/api/paas/v4",      model: "glm-4-flash" },
  kimi:        { provider: "kimi",        baseUrl: "https://api.moonshot.cn/v1",                model: "moonshot-v1-128k" },
  minimax:     { provider: "minimax",     baseUrl: "https://api.minimaxi.com/v1",            model: "MiniMax-M2.7" },
  doubao:      { provider: "doubao",      baseUrl: "https://ark.cn-beijing.volces.com/api/v3",  model: "doubao-1-5-pro-256k" },
  qwen:        { provider: "qwen",        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  stepfun:     { provider: "stepfun",     baseUrl: "https://api.stepfun.com/v1",                model: "step-2-16k" },
  siliconflow: { provider: "siliconflow", baseUrl: "https://api.siliconflow.cn/v1",             model: "deepseek-ai/DeepSeek-V3" },
};

const DEFAULT_SETTINGS: AppSettings = {
  ai: { ...DEFAULTS.deepseek, apiKey: "", temperature: 0.7 },
  language: "zh",
};

async function saveSettings(s: AppSettings) {
  try {
    await settingsIpc.set(SETTINGS_KEY, JSON.stringify(s));
  } catch { /* backend may not be ready yet */ }
}

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  setProvider: (provider: AIProvider) => void;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setTemperature: (t: number) => void;
  setLanguage: (lang: "zh" | "en") => void;
  saveAIConfig: (ai: AISettings) => void;
  getAIConfig: () => AISettings;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await settingsIpc.get(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppSettings;
        set({ settings: parsed, isLoaded: true });
        return;
      }
    } catch { /* use defaults */ }
    set({ isLoaded: true });
  },

  setProvider: (provider) =>
    set((s) => {
      const def = DEFAULTS[provider];
      const updated = { ...s.settings, ai: { ...s.settings.ai, ...def } };
      saveSettings(updated);
      return { settings: updated };
    }),

  setApiKey: (apiKey) =>
    set((s) => {
      const updated = { ...s.settings, ai: { ...s.settings.ai, apiKey } };
      saveSettings(updated);
      return { settings: updated };
    }),

  setBaseUrl: (baseUrl) =>
    set((s) => {
      const updated = { ...s.settings, ai: { ...s.settings.ai, baseUrl } };
      saveSettings(updated);
      return { settings: updated };
    }),

  setModel: (model) =>
    set((s) => {
      const updated = { ...s.settings, ai: { ...s.settings.ai, model } };
      saveSettings(updated);
      return { settings: updated };
    }),

  setTemperature: (temperature) =>
    set((s) => {
      const updated = { ...s.settings, ai: { ...s.settings.ai, temperature } };
      saveSettings(updated);
      return { settings: updated };
    }),

  setLanguage: (language) =>
    set((s) => {
      const updated = { ...s.settings, language };
      saveSettings(updated);
      return { settings: updated };
    }),

  saveAIConfig: (ai) =>
    set((s) => {
      const updated = { ...s.settings, ai };
      saveSettings(updated);
      return { settings: updated };
    }),

  getAIConfig: () => get().settings.ai,
}));

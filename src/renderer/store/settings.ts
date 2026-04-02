import { create } from 'zustand';
import type { AppConfig, AppearanceSettings, FeatureToggles, ProviderConfigs, ProviderSettings, ProviderType, Theme } from '../../shared/types';

interface SettingsState {
  theme: Theme;
  appearance: AppearanceSettings;
  aiSettings: {
    provider: ProviderType;
    configs: ProviderConfigs;
  };
  features: FeatureToggles;
  settingsOpen: boolean;
  settingsTab: 'appearance' | 'ai' | 'system';
  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  loadAppearance: () => Promise<void>;
  setAppearance: (appearance: AppearanceSettings) => Promise<void>;
  setProvider: (provider: ProviderType) => Promise<void>;
  setProviderConfig: (provider: ProviderType, config: ProviderSettings) => Promise<void>;
  setFeatures: (features: Partial<FeatureToggles>) => Promise<void>;
}

const defaultTheme: Theme = {
  name: 'Auto Shell Dark',
  background: '#0f1115',
  foreground: '#d8dee9',
  accent: '#4c8dff'
};

const defaultAppearance: AppearanceSettings = {
  terminalTransparency: false,
  terminalOpacity: 0.7,
  terminalBackdrop: false
};

const defaultConfigs: ProviderConfigs = {
  minimax: {
    baseUrl: 'https://api.minimaxi.com/anthropic',
    model: 'MiniMax-M2.7'
  },
  glm: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4.5'
  },
  claude: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-3-7-sonnet-latest'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  },
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b'
  },
  openaiCompatible: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini'
  }
};

const defaultFeatures: FeatureToggles = {
  errorCard: true,
  naturalCommand: true,
  explainCommand: true,
  completion: false
};

function applyThemeToDocument(theme: Theme) {
  const light = isLightColor(theme.background);
  const surfaceDelta = light ? -10 : 8;
  const elevatedDelta = light ? -16 : 14;

  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  document.documentElement.style.setProperty('--bg', theme.background);
  document.documentElement.style.setProperty('--bg2', shiftColor(theme.background, surfaceDelta));
  document.documentElement.style.setProperty('--bg3', shiftColor(theme.background, light ? elevatedDelta : surfaceDelta * 1.75));
  document.documentElement.style.setProperty('--bg4', shiftColor(theme.background, light ? elevatedDelta * 1.22 : surfaceDelta * 2.5));
  document.documentElement.style.setProperty('--bg5', shiftColor(theme.background, light ? elevatedDelta * 1.42 : surfaceDelta * 3.25));
  document.documentElement.style.setProperty('--border', light ? 'rgba(26, 37, 56, 0.14)' : 'rgba(255, 255, 255, 0.08)');
  document.documentElement.style.setProperty('--border2', light ? 'rgba(26, 37, 56, 0.24)' : 'rgba(255, 255, 255, 0.16)');
  document.documentElement.style.setProperty('--text', theme.foreground);
  document.documentElement.style.setProperty('--text2', mixColors(theme.foreground, theme.background, light ? 0.36 : 0.60));
  document.documentElement.style.setProperty('--text3', mixColors(theme.foreground, theme.background, light ? 0.54 : 0.78));
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-dim', withAlpha(theme.accent, light ? '14' : '22'));
  document.documentElement.style.setProperty('--ai-bg', withAlpha(theme.accent, light ? '0d' : '14'));
  document.documentElement.style.setProperty('--ai-border', withAlpha(theme.accent, light ? '26' : '44'));
  document.documentElement.style.setProperty('--app-glow', withAlpha(theme.accent, light ? '0f' : '20'));
  document.documentElement.style.setProperty('--surface-top', shiftColor(theme.background, light ? 4 : 6));
  document.documentElement.style.setProperty('--surface-bottom', shiftColor(theme.background, light ? -6 : 0));
  document.documentElement.style.setProperty('--scrollbar-thumb', light ? 'rgba(26, 37, 56, 0.18)' : 'rgba(255, 255, 255, 0.12)');
  document.documentElement.style.setProperty('--scrollbar-thumb-hover', light ? 'rgba(26, 37, 56, 0.28)' : 'rgba(255, 255, 255, 0.18)');
  document.documentElement.style.setProperty('--focus-ring', withAlpha(theme.accent, light ? 'cc' : 'e6'));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: defaultTheme,
  appearance: defaultAppearance,
  aiSettings: {
    provider: 'minimax',
    configs: defaultConfigs
  },
  features: defaultFeatures,
  settingsOpen: false,
  settingsTab: 'ai',

  load: async () => {
    try {
      const config: AppConfig = await window.api.getConfig();
      set({
        theme: config.theme ?? defaultTheme,
        aiSettings: {
          provider: config.provider,
          configs: {
            ...defaultConfigs,
            ...config.providerConfigs
          }
        },
        features: config.aiFeatures ?? defaultFeatures
      });
      applyThemeToDocument(config.theme ?? defaultTheme);
    } catch (error) {
      console.error('Failed to load settings:', error);
      applyThemeToDocument(defaultTheme);
    }
    await get().loadAppearance();
  },

  setTheme: async (theme) => {
    set({ theme });
    applyThemeToDocument(theme);
    await window.api.saveTheme(theme);
  },

  loadAppearance: async () => {
    try {
      const appearance = await window.api.getAppearance();
      set({ appearance });
    } catch (error) {
      console.error('Failed to load appearance settings:', error);
    }
  },

  setAppearance: async (appearance) => {
    set({ appearance });
    await window.api.saveAppearance(appearance);
  },

  setProvider: async (provider) => {
    set((state) => ({
      aiSettings: {
        ...state.aiSettings,
        provider
      }
    }));
    await window.api.setProvider(provider);
  },

  setProviderConfig: async (provider, config) => {
    set((state) => ({
      aiSettings: {
        ...state.aiSettings,
        configs: {
          ...state.aiSettings.configs,
          [provider]: config
        }
      }
    }));
    await window.api.saveProviderConfig(provider, config);
  },

  setFeatures: async (features) => {
    const nextFeatures = {
      ...get().features,
      ...features
    };
    set({ features: nextFeatures });
    await window.api.saveFeatures(nextFeatures);
  }
}));

function shiftColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const delta = Math.round(amount);
  const r = clamp((value >> 16) + delta);
  const g = clamp(((value >> 8) & 0xff) + delta);
  const b = clamp((value & 0xff) + delta);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function mixColors(primary: string, secondary: string, ratio: number): string {
  const a = parseHex(primary);
  const b = parseHex(secondary);
  const mix = (start: number, end: number) => Math.round(start * (1 - ratio) + end * ratio);
  return rgbToHex(mix(a.r, b.r), mix(a.g, b.g), mix(a.b, b.b));
}

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function isLightColor(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.72;
}

function parseHex(hex: string) {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

export type { Theme, AppearanceSettings, FeatureToggles, ProviderType, ProviderSettings, ProviderConfigs };

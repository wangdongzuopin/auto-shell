import { create } from 'zustand';
import type { AppConfig, FeatureToggles, ProviderConfigs, ProviderSettings, ProviderType, Theme } from '../../shared/types';

interface SettingsState {
  theme: Theme;
  aiSettings: {
    provider: ProviderType;
    configs: ProviderConfigs;
  };
  features: FeatureToggles;
  settingsOpen: boolean;
  settingsTab: 'appearance' | 'ai' | 'system';
  load: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setProvider: (provider: ProviderType) => Promise<void>;
  setProviderConfig: (provider: ProviderType, config: ProviderSettings) => Promise<void>;
  setFeatures: (features: Partial<FeatureToggles>) => Promise<void>;
}

const defaultTheme: Theme = {
  name: 'Auto Shell Slate',
  background: '#0f1115',
  foreground: '#d8dee9',
  accent: '#4c8dff'
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
  document.documentElement.style.setProperty('--bg', theme.background);
  document.documentElement.style.setProperty('--bg2', lighten(theme.background, 8));
  document.documentElement.style.setProperty('--bg3', lighten(theme.background, 14));
  document.documentElement.style.setProperty('--bg4', lighten(theme.background, 22));
  document.documentElement.style.setProperty('--bg5', lighten(theme.background, 28));
  document.documentElement.style.setProperty('--text', theme.foreground);
  document.documentElement.style.setProperty('--accent', theme.accent);
  document.documentElement.style.setProperty('--accent-dim', `${theme.accent}22`);
  document.documentElement.style.setProperty('--ai-bg', `${theme.accent}14`);
  document.documentElement.style.setProperty('--ai-border', `${theme.accent}44`);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: defaultTheme,
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
  },

  setTheme: async (theme) => {
    set({ theme });
    applyThemeToDocument(theme);
    await window.api.saveTheme(theme);
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

function lighten(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = Math.min(255, (value >> 16) + amount);
  const g = Math.min(255, ((value >> 8) & 0xff) + amount);
  const b = Math.min(255, (value & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export type { Theme, FeatureToggles, ProviderType, ProviderSettings, ProviderConfigs };

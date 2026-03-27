import { create } from 'zustand';

export interface Theme {
  name: string;
  background: string;
  foreground: string;
  accent: string;
  ansiColors?: string[];
}

export interface AISettings {
  provider: 'minimax' | 'claude' | 'openai' | 'ollama';
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface FeatureToggles {
  errorCard: boolean;
  naturalCommand: boolean;
  explainCommand: boolean;
  completion: boolean;
}

interface SettingsState {
  theme: Theme;
  aiSettings: AISettings;
  features: FeatureToggles;
  settingsOpen: boolean;
  settingsTab: 'appearance' | 'ai' | 'system';
  load: () => Promise<void>;
  setTheme: (theme: Theme) => void;
  setAISettings: (settings: Partial<AISettings>) => void;
  setFeatures: (features: Partial<FeatureToggles>) => void;
  setProvider: (provider: AISettings['provider']) => void;
}

const defaultTheme: Theme = {
  name: 'NexTerm Dark',
  background: '#0e0f11',
  foreground: '#c9cdd6',
  accent: '#7c6af7'
};

const defaultAISettings: AISettings = {
  provider: 'minimax',
  apiKey: '',
  baseUrl: 'https://api.minimaxi.com/v1',
  model: 'MiniMax-M2.7'
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: defaultTheme,
  aiSettings: defaultAISettings,
  features: {
    errorCard: true,
    naturalCommand: true,
    explainCommand: true,
    completion: false
  },
  settingsOpen: false,
  settingsTab: 'ai',

  load: async () => {
    try {
      const config = await window.api.getConfig();
      if (config.theme) {
        set({ theme: config.theme });
      }
      if (config.provider) {
        set(state => ({
          aiSettings: {
            ...state.aiSettings,
            provider: config.provider,
            ...config.providerConfig
          }
        }));
      }
      if (config.aiFeatures) {
        set({ features: config.aiFeatures });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },

  setTheme: (theme) => {
    set({ theme });
    // Apply CSS variables
    document.documentElement.style.setProperty('--bg', theme.background);
    document.documentElement.style.setProperty('--accent', theme.accent);
  },

  setAISettings: (settings) => set(state => ({
    aiSettings: { ...state.aiSettings, ...settings }
  })),

  setFeatures: (features) => set(state => ({
    features: { ...state.features, ...features }
  })),

  setProvider: (provider) => {
    set(state => ({
      aiSettings: { ...state.aiSettings, provider }
    }));
    window.api.setConfig('provider', provider);
  }
}));

// src/main/session-store.ts
import Store from 'electron-store';
import * as keytar from 'keytar';

const SERVICE = 'NexTerm';

interface StoreSchema {
  provider: 'minimax' | 'claude' | 'openai' | 'ollama';
  minimax: { baseUrl: string; model: string };
  claude: { baseUrl: string; model: string };
  openai: { baseUrl: string; model: string };
  ollama: { baseUrl: string; model: string };
  aiFeatures: {
    errorCard: boolean;
    naturalCommand: boolean;
    explainCommand: boolean;
    completion: boolean;
  };
  theme: {
    name: string;
    background: string;
    foreground: string;
    accent: string;
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    provider: 'minimax',
    minimax: { baseUrl: 'https://api.minimaxi.com/v1', model: 'MiniMax-M2.7' },
    claude: { baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
    openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
    ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
    aiFeatures: {
      errorCard: true,
      naturalCommand: true,
      explainCommand: true,
      completion: false
    },
    theme: {
      name: 'NexTerm Dark',
      background: '#0e0f11',
      foreground: '#c9cdd6',
      accent: '#7c6af7'
    }
  }
});

export async function saveApiKey(provider: string, key: string): Promise<void> {
  await keytar.setPassword(SERVICE, provider, key);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, provider);
}

export async function deleteApiKey(provider: string): Promise<void> {
  await keytar.deletePassword(SERVICE, provider);
}

export function getConfig() {
  return {
    provider: store.get('provider'),
    providerConfig: store.get(store.get('provider')),
    aiFeatures: store.get('aiFeatures'),
    theme: store.get('theme')
  };
}

export function setProvider(provider: StoreSchema['provider']) {
  store.set('provider', provider);
}

export function setProviderConfig<T extends keyof Omit<StoreSchema, 'provider' | 'aiFeatures' | 'theme'>>(
  provider: T,
  config: StoreSchema[T]
) {
  store.set(provider, config);
}

export { store };

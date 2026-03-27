// src/main/ipc-handlers.ts
import { ipcMain } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { createProvider, ProviderConfig } from '../ai';
import { getApiKey, saveApiKey, getConfig, setProvider, setProviderConfig } from './session-store';

let currentProvider: ReturnType<typeof createProvider> | null = null;

async function getProvider() {
  if (currentProvider) return currentProvider;

  const config = getConfig();
  const apiKey = await getApiKey(config.provider);

  currentProvider = createProvider({
    type: config.provider,
    apiKey: apiKey ?? undefined,
    ...config.providerConfig
  } as ProviderConfig);

  return currentProvider;
}

export function registerIpcHandlers() {
  // AI handlers
  ipcMain.handle(IPC.AI_CHECK_AVAILABLE, async () => {
    const provider = await getProvider();
    return provider.isAvailable();
  });

  ipcMain.handle(IPC.AI_EXPLAIN_ERROR, async (event, ctx) => {
    const provider = await getProvider();
    return provider.explainError(ctx);
  });

  ipcMain.handle(IPC.AI_NATURAL_CMD, async (event, input, shell) => {
    const provider = await getProvider();
    return provider.naturalToCommand(input, shell);
  });

  ipcMain.handle(IPC.AI_EXPLAIN_CMD, async (event, command) => {
    const provider = await getProvider();
    return provider.explainCommand(command);
  });

  // Config handlers
  ipcMain.handle(IPC.CONFIG_GET, () => {
    return getConfig();
  });

  ipcMain.handle(IPC.CONFIG_SET, (event, key, value) => {
    if (key === 'provider') {
      setProvider(value);
      currentProvider = null; // Reset provider
    } else {
      setProviderConfig(key, value);
    }
    return true;
  });

  // Key handlers
  ipcMain.handle(IPC.KEY_GET, async (event, provider) => {
    return getApiKey(provider);
  });

  ipcMain.handle(IPC.KEY_SAVE, async (event, provider, key) => {
    await saveApiKey(provider, key);
    if (provider === getConfig().provider) {
      currentProvider = null; // Reset provider to pick up new key
    }
    return true;
  });
}

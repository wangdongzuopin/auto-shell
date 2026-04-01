import { ipcMain } from 'electron';
import * as fs from 'fs';
import { createProvider, ProviderConfig } from '../ai';
import { IPC } from '../shared/ipc-channels';
import type { ChatMessage, FeatureToggles, ProviderSettings, ProviderType, Theme } from '../shared/types';
import { getApiKey, getConfig, saveApiKey, setFeatures, setProvider, setProviderConfig, setTheme } from './session-store';

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

function invalidateProvider() {
  currentProvider = null;
}

export function registerIpcHandlers() {
  ipcMain.handle(IPC.AI_CHECK_AVAILABLE, async () => {
    const provider = await getProvider();
    return provider.isAvailable();
  });

  ipcMain.handle(IPC.AI_CHAT, async (_event, messages: ChatMessage[]) => {
    const provider = await getProvider();
    return provider.chat(messages);
  });

  ipcMain.on(IPC.AI_CHAT_STREAM_START, async (event, requestId: string, messages: ChatMessage[]) => {
    try {
      const provider = await getProvider();
      await provider.streamChat(messages, (chunk) => {
        event.sender.send(IPC.AI_CHAT_STREAM_CHUNK, requestId, chunk);
      });
      event.sender.send(IPC.AI_CHAT_STREAM_DONE, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 流式对话失败';
      event.sender.send(IPC.AI_CHAT_STREAM_ERROR, requestId, message);
    }
  });

  ipcMain.handle(IPC.AI_EXPLAIN_ERROR, async (_event, ctx) => {
    const provider = await getProvider();
    return provider.explainError(ctx);
  });

  ipcMain.handle(IPC.AI_NATURAL_CMD, async (_event, input, shell) => {
    const provider = await getProvider();
    return provider.naturalToCommand(input, shell);
  });

  ipcMain.handle(IPC.AI_EXPLAIN_CMD, async (_event, command) => {
    const provider = await getProvider();
    return provider.explainCommand(command);
  });

  ipcMain.handle(IPC.CONFIG_GET, () => getConfig());

  ipcMain.handle(IPC.CONFIG_SET_PROVIDER, (_event, provider: ProviderType) => {
    setProvider(provider);
    invalidateProvider();
    return true;
  });

  ipcMain.handle(
    IPC.CONFIG_SET_PROVIDER_CONFIG,
    (_event, provider: ProviderType, config: ProviderSettings) => {
      setProviderConfig(provider, config);
      if (provider === getConfig().provider) {
        invalidateProvider();
      }
      return true;
    }
  );

  ipcMain.handle(IPC.CONFIG_SET_THEME, (_event, theme: Theme) => {
    setTheme(theme);
    return true;
  });

  ipcMain.handle(IPC.CONFIG_SET_FEATURES, (_event, features: FeatureToggles) => {
    setFeatures(features);
    return true;
  });

  ipcMain.handle(IPC.KEY_GET, async (_event, provider: ProviderType) => getApiKey(provider));

  ipcMain.handle(IPC.KEY_SAVE, async (_event, provider: ProviderType, key: string) => {
    await saveApiKey(provider, key);
    if (provider === getConfig().provider) {
      invalidateProvider();
    }
    return true;
  });

  ipcMain.handle(IPC.PATH_EXISTS, async (_event, targetPath: string) => {
    if (!targetPath) {
      return false;
    }

    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  });
}

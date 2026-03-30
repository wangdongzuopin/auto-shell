import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipc-channels';
import type { AppConfig, ChatMessage, FeatureToggles, ProviderSettings, ProviderType, Theme } from './shared/types';

export interface ElectronAPI {
  checkAIAvailable: () => Promise<boolean>;
  chatWithAI: (messages: ChatMessage[]) => Promise<string>;
  streamChatWithAI: (
    requestId: string,
    messages: ChatMessage[],
    callbacks: {
      onChunk: (chunk: string) => void;
      onDone: () => void;
      onError: (message: string) => void;
    }
  ) => () => void;
  explainError: (ctx: any) => Promise<string>;
  naturalToCommand: (input: string, shell: string) => Promise<string>;
  explainCommand: (command: string) => Promise<any>;

  getConfig: () => Promise<AppConfig>;
  setProvider: (provider: ProviderType) => Promise<boolean>;
  saveProviderConfig: (provider: ProviderType, config: ProviderSettings) => Promise<boolean>;
  saveTheme: (theme: Theme) => Promise<boolean>;
  saveFeatures: (features: FeatureToggles) => Promise<boolean>;

  getKey: (provider: ProviderType) => Promise<string | null>;
  saveKey: (provider: ProviderType, key: string) => Promise<boolean>;

  createPty: (id: string, shell: string, cwd: string) => Promise<string>;
  writePty: (id: string, data: string) => void;
  resizePty: (id: string, cols: number, rows: number) => void;
  killPty: (id: string) => void;
  onPtyOutput: (callback: (id: string, data: string) => void) => () => void;
  onPtyExit: (callback: (id: string, code: number) => void) => () => void;

  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
}

const api: ElectronAPI = {
  checkAIAvailable: () => ipcRenderer.invoke(IPC.AI_CHECK_AVAILABLE),
  chatWithAI: (messages) => ipcRenderer.invoke(IPC.AI_CHAT, messages),
  streamChatWithAI: (requestId, messages, callbacks) => {
    const chunkListener = (_event: Electron.IpcRendererEvent, id: string, chunk: string) => {
      if (id === requestId) {
        callbacks.onChunk(chunk);
      }
    };
    const doneListener = (_event: Electron.IpcRendererEvent, id: string) => {
      if (id === requestId) {
        callbacks.onDone();
      }
    };
    const errorListener = (_event: Electron.IpcRendererEvent, id: string, message: string) => {
      if (id === requestId) {
        callbacks.onError(message);
      }
    };

    ipcRenderer.on(IPC.AI_CHAT_STREAM_CHUNK, chunkListener);
    ipcRenderer.on(IPC.AI_CHAT_STREAM_DONE, doneListener);
    ipcRenderer.on(IPC.AI_CHAT_STREAM_ERROR, errorListener);
    ipcRenderer.send(IPC.AI_CHAT_STREAM_START, requestId, messages);

    return () => {
      ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_CHUNK, chunkListener);
      ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_DONE, doneListener);
      ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_ERROR, errorListener);
    };
  },
  explainError: (ctx) => ipcRenderer.invoke(IPC.AI_EXPLAIN_ERROR, ctx),
  naturalToCommand: (input, shell) => ipcRenderer.invoke(IPC.AI_NATURAL_CMD, input, shell),
  explainCommand: (command) => ipcRenderer.invoke(IPC.AI_EXPLAIN_CMD, command),

  getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  setProvider: (provider) => ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER, provider),
  saveProviderConfig: (provider, config) => ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER_CONFIG, provider, config),
  saveTheme: (theme) => ipcRenderer.invoke(IPC.CONFIG_SET_THEME, theme),
  saveFeatures: (features) => ipcRenderer.invoke(IPC.CONFIG_SET_FEATURES, features),

  getKey: (provider) => ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),

  createPty: (id, shell, cwd) => ipcRenderer.invoke('pty:create', id, shell, cwd),
  writePty: (id, data) => ipcRenderer.send('pty:input', id, data),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
  killPty: (id) => ipcRenderer.send('pty:kill', id),
  onPtyOutput: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, data: string) => callback(id, data);
    ipcRenderer.on('pty:output', listener);
    return () => ipcRenderer.removeListener('pty:output', listener);
  },
  onPtyExit: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, code: number) => callback(id, code);
    ipcRenderer.on('pty:exit', listener);
    return () => ipcRenderer.removeListener('pty:exit', listener);
  },

  minimizeWindow: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC.WINDOW_CLOSE)
};

contextBridge.exposeInMainWorld('api', api);

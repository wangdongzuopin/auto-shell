// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipc-channels';

export interface ElectronAPI {
  // AI
  checkAIAvailable: () => Promise<boolean>;
  explainError: (ctx: any) => Promise<AsyncGenerator<string>>;
  naturalToCommand: (input: string, shell: string) => Promise<AsyncGenerator<string>>;
  explainCommand: (command: string) => Promise<any>;

  // Config
  getConfig: () => Promise<any>;
  setConfig: (key: string, value: any) => Promise<boolean>;

  // Keys
  getKey: (provider: string) => Promise<string | null>;
  saveKey: (provider: string, key: string) => Promise<boolean>;

  // PTY
  createPty: (shell: string, cwd: string) => Promise<string>;
  writePty: (id: string, data: string) => void;
  resizePty: (id: string, cols: number, rows: number) => void;
  killPty: (id: string) => void;
  onPtyOutput: (callback: (id: string, data: string) => void) => void;
  onPtyExit: (callback: (id: string, code: number) => void) => void;
}

const api: ElectronAPI = {
  // AI
  checkAIAvailable: () => ipcRenderer.invoke(IPC.AI_CHECK_AVAILABLE),
  explainError: (ctx) => ipcRenderer.invoke(IPC.AI_EXPLAIN_ERROR, ctx),
  naturalToCommand: (input, shell) => ipcRenderer.invoke(IPC.AI_NATURAL_CMD, input, shell),
  explainCommand: (command) => ipcRenderer.invoke(IPC.AI_EXPLAIN_CMD, command),

  // Config
  getConfig: () => ipcRenderer.invoke(IPC.CONFIG_GET),
  setConfig: (key, value) => ipcRenderer.invoke(IPC.CONFIG_SET, key, value),

  // Keys
  getKey: (provider) => ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),

  // PTY (placeholder for now)
  createPty: (shell, cwd) => ipcRenderer.invoke('pty:create', shell, cwd),
  writePty: (id, data) => ipcRenderer.send('pty:input', id, data),
  resizePty: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
  killPty: (id) => ipcRenderer.send('pty:kill', id),
  onPtyOutput: (callback) => ipcRenderer.on('pty:output', (event, id, data) => callback(id, data)),
  onPtyExit: (callback) => ipcRenderer.on('pty:exit', (event, id, code) => callback(id, code)),
};

contextBridge.exposeInMainWorld('api', api);

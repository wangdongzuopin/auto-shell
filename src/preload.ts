import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipc-channels';
import type {
  AppConfig,
  AppearanceSettings,
  ChatMessage,
  FeatureToggles,
  ProviderSettings,
  ProviderType,
  TerminalSession,
  Theme
} from './shared/types';

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
  getAppearance: () => Promise<AppearanceSettings>;
  setProvider: (provider: ProviderType) => Promise<boolean>;
  saveProviderConfig: (provider: ProviderType, config: ProviderSettings) => Promise<boolean>;
  saveTheme: (theme: Theme) => Promise<boolean>;
  saveFeatures: (features: FeatureToggles) => Promise<boolean>;
  saveAppearance: (appearance: AppearanceSettings) => Promise<boolean>;

  getKey: (provider: ProviderType) => Promise<string | null>;
  saveKey: (provider: ProviderType, key: string) => Promise<boolean>;
  pathExists: (targetPath: string) => Promise<boolean>;
  resolveProjectPath: (input: string) => Promise<string | null>;
  findProjectCandidates: (input: string) => Promise<string[]>;
  getTerminalSession: () => Promise<TerminalSession>;
  saveTerminalSession: (session: TerminalSession) => Promise<boolean>;
  recordTerminalCommand: (cwd: string, command: string) => Promise<boolean>;

  createPty: (id: string, shell: string, cwd: string) => Promise<string>;
  writePty: (id: string, data: string) => void;
  resizePty: (id: string, cols: number, rows: number) => void;
  killPty: (id: string) => void;
  onPtyOutput: (callback: (id: string, data: string) => void) => () => void;
  onPtyExit: (callback: (id: string, code: number) => void) => () => void;
  onPtyCommand: (callback: (id: string, command: string) => void) => () => void;

  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  openFolderDialog: (title: string) => Promise<string | null>;

  getSkillsFromDisk: () => Promise<any[]>;
  getSkillByPath: (path: string) => Promise<any | null>;

  saveSession: (threadId: string, data: unknown) => Promise<boolean>;
  loadSession: (threadId: string) => Promise<any | null>;
  listSessions: () => Promise<string[]>;
  deleteSession: (threadId: string) => Promise<boolean>;
  listAllSessions: () => Promise<any[]>;

  // Tools
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  globFiles: (pattern: string, cwd?: string) => Promise<{ success: boolean; matches?: string[]; error?: string }>;
  grepFiles: (pattern: string, cwd?: string, options?: { ext?: string[] }) => Promise<{ success: boolean; matches?: Array<{ file: string; line: number; content: string }>; error?: string }>;
  bashCommand: (command: string, cwd?: string) => Promise<{ exitCode: number; output: string; error?: string }>;
  openUrl: (url: string) => Promise<{ success: boolean; error?: string }>;

  // MCP
  getMCPServers: () => Promise<string[]>;
  getMCPTools: (serverName: string) => Promise<any[]>;
  callMCPTool: (serverName: string, toolName: string, args: Record<string, unknown>) => Promise<{ success: boolean; result?: unknown; error?: string }>;
  disconnectMCPServer: (serverName: string) => Promise<boolean>;
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
  getAppearance: () => ipcRenderer.invoke(IPC.CONFIG_GET_APPEARANCE),
  setProvider: (provider) => ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER, provider),
  saveProviderConfig: (provider, config) => ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER_CONFIG, provider, config),
  saveTheme: (theme) => ipcRenderer.invoke(IPC.CONFIG_SET_THEME, theme),
  saveFeatures: (features) => ipcRenderer.invoke(IPC.CONFIG_SET_FEATURES, features),
  saveAppearance: (appearance) => ipcRenderer.invoke(IPC.CONFIG_SET_APPEARANCE, appearance),

  getKey: (provider) => ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),
  pathExists: (targetPath) => ipcRenderer.invoke(IPC.PATH_EXISTS, targetPath),
  resolveProjectPath: (input) => ipcRenderer.invoke(IPC.PATH_RESOLVE_PROJECT, input),
  findProjectCandidates: (input) => ipcRenderer.invoke(IPC.PATH_FIND_PROJECT_CANDIDATES, input),
  getTerminalSession: () => ipcRenderer.invoke(IPC.TERMINAL_SESSION_GET),
  saveTerminalSession: (session) => ipcRenderer.invoke(IPC.TERMINAL_SESSION_SAVE, session),
  recordTerminalCommand: (cwd, command) => ipcRenderer.invoke(IPC.TERMINAL_HISTORY_RECORD, cwd, command),

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
  onPtyCommand: (callback: (id: string, command: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, command: string) => callback(id, command);
    ipcRenderer.on(IPC.PTY_COMMAND, listener);
    return () => ipcRenderer.removeListener(IPC.PTY_COMMAND, listener);
  },

  minimizeWindow: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  maximizeWindow: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
  closeWindow: () => ipcRenderer.send(IPC.WINDOW_CLOSE),

  openFolderDialog: (title: string) => ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER, title),

  getSkillsFromDisk: () => ipcRenderer.invoke(IPC.SKILLS_GET_ALL),
  getSkillByPath: (path: string) => ipcRenderer.invoke(IPC.SKILLS_GET_BY_PATH, path),

  saveSession: (threadId: string, data: unknown) => ipcRenderer.invoke(IPC.SESSION_SAVE, threadId, data),
  loadSession: (threadId: string) => ipcRenderer.invoke(IPC.SESSION_LOAD, threadId),
  listSessions: () => ipcRenderer.invoke(IPC.SESSION_LIST),
  deleteSession: (threadId: string) => ipcRenderer.invoke(IPC.SESSION_DELETE, threadId),
  listAllSessions: () => ipcRenderer.invoke(IPC.SESSION_LIST_ALL),

  // Tools
  readFile: (filePath: string) => ipcRenderer.invoke(IPC.TOOL_READ, filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke(IPC.TOOL_WRITE, filePath, content),
  globFiles: (pattern: string, cwd?: string) => ipcRenderer.invoke(IPC.TOOL_GLOB, pattern, cwd),
  grepFiles: (pattern: string, cwd?: string, options?: { ext?: string[] }) => ipcRenderer.invoke(IPC.TOOL_GREP, pattern, cwd, options),
  bashCommand: (command: string, cwd?: string) => ipcRenderer.invoke(IPC.TOOL_BASH, command, cwd),
  openUrl: (url: string) => ipcRenderer.invoke(IPC.TOOL_OPEN_URL, url),

  // MCP
  getMCPServers: () => ipcRenderer.invoke(IPC.MCP_GET_SERVERS),
  getMCPTools: (serverName: string) => ipcRenderer.invoke(IPC.MCP_GET_TOOLS, serverName),
  callMCPTool: (serverName: string, toolName: string, args: Record<string, unknown>) => ipcRenderer.invoke(IPC.MCP_CALL_TOOL, serverName, toolName, args),
  disconnectMCPServer: (serverName: string) => ipcRenderer.invoke(IPC.MCP_DISCONNECT, serverName),
};

contextBridge.exposeInMainWorld('api', api);

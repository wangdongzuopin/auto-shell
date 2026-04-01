"use strict";
const electron = require("electron");
const IPC = {
  // AI
  AI_CHAT: "ai:chat",
  AI_CHAT_STREAM_START: "ai:chat-stream:start",
  AI_CHAT_STREAM_CHUNK: "ai:chat-stream:chunk",
  AI_CHAT_STREAM_DONE: "ai:chat-stream:done",
  AI_CHAT_STREAM_ERROR: "ai:chat-stream:error",
  AI_EXPLAIN_ERROR: "ai:explain-error",
  AI_NATURAL_CMD: "ai:natural-cmd",
  AI_EXPLAIN_CMD: "ai:explain-cmd",
  AI_CHECK_AVAILABLE: "ai:check-available",
  // Config
  CONFIG_GET: "config:get",
  CONFIG_SET_PROVIDER: "config:set-provider",
  CONFIG_SET_PROVIDER_CONFIG: "config:set-provider-config",
  CONFIG_SET_THEME: "config:set-theme",
  CONFIG_SET_FEATURES: "config:set-features",
  KEY_SAVE: "key:save",
  KEY_GET: "key:get",
  PATH_EXISTS: "path:exists",
  PATH_RESOLVE_PROJECT: "path:resolve-project",
  PATH_FIND_PROJECT_CANDIDATES: "path:find-project-candidates",
  TERMINAL_SESSION_GET: "terminal-session:get",
  TERMINAL_SESSION_SAVE: "terminal-session:save",
  TERMINAL_HISTORY_RECORD: "terminal-history:record",
  // PTY command events
  PTY_COMMAND: "pty:command",
  // Window controls
  WINDOW_MINIMIZE: "window:minimize",
  WINDOW_MAXIMIZE: "window:maximize",
  WINDOW_CLOSE: "window:close"
};
const api = {
  checkAIAvailable: () => electron.ipcRenderer.invoke(IPC.AI_CHECK_AVAILABLE),
  chatWithAI: (messages) => electron.ipcRenderer.invoke(IPC.AI_CHAT, messages),
  streamChatWithAI: (requestId, messages, callbacks) => {
    const chunkListener = (_event, id, chunk) => {
      if (id === requestId) {
        callbacks.onChunk(chunk);
      }
    };
    const doneListener = (_event, id) => {
      if (id === requestId) {
        callbacks.onDone();
      }
    };
    const errorListener = (_event, id, message) => {
      if (id === requestId) {
        callbacks.onError(message);
      }
    };
    electron.ipcRenderer.on(IPC.AI_CHAT_STREAM_CHUNK, chunkListener);
    electron.ipcRenderer.on(IPC.AI_CHAT_STREAM_DONE, doneListener);
    electron.ipcRenderer.on(IPC.AI_CHAT_STREAM_ERROR, errorListener);
    electron.ipcRenderer.send(IPC.AI_CHAT_STREAM_START, requestId, messages);
    return () => {
      electron.ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_CHUNK, chunkListener);
      electron.ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_DONE, doneListener);
      electron.ipcRenderer.removeListener(IPC.AI_CHAT_STREAM_ERROR, errorListener);
    };
  },
  explainError: (ctx) => electron.ipcRenderer.invoke(IPC.AI_EXPLAIN_ERROR, ctx),
  naturalToCommand: (input, shell) => electron.ipcRenderer.invoke(IPC.AI_NATURAL_CMD, input, shell),
  explainCommand: (command) => electron.ipcRenderer.invoke(IPC.AI_EXPLAIN_CMD, command),
  getConfig: () => electron.ipcRenderer.invoke(IPC.CONFIG_GET),
  setProvider: (provider) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER, provider),
  saveProviderConfig: (provider, config) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER_CONFIG, provider, config),
  saveTheme: (theme) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_THEME, theme),
  saveFeatures: (features) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_FEATURES, features),
  getKey: (provider) => electron.ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => electron.ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),
  pathExists: (targetPath) => electron.ipcRenderer.invoke(IPC.PATH_EXISTS, targetPath),
  resolveProjectPath: (input) => electron.ipcRenderer.invoke(IPC.PATH_RESOLVE_PROJECT, input),
  findProjectCandidates: (input) => electron.ipcRenderer.invoke(IPC.PATH_FIND_PROJECT_CANDIDATES, input),
  getTerminalSession: () => electron.ipcRenderer.invoke(IPC.TERMINAL_SESSION_GET),
  saveTerminalSession: (session) => electron.ipcRenderer.invoke(IPC.TERMINAL_SESSION_SAVE, session),
  recordTerminalCommand: (cwd, command) => electron.ipcRenderer.invoke(IPC.TERMINAL_HISTORY_RECORD, cwd, command),
  createPty: (id, shell, cwd) => electron.ipcRenderer.invoke("pty:create", id, shell, cwd),
  writePty: (id, data) => electron.ipcRenderer.send("pty:input", id, data),
  resizePty: (id, cols, rows) => electron.ipcRenderer.send("pty:resize", id, cols, rows),
  killPty: (id) => electron.ipcRenderer.send("pty:kill", id),
  onPtyOutput: (callback) => {
    const listener = (_event, id, data) => callback(id, data);
    electron.ipcRenderer.on("pty:output", listener);
    return () => electron.ipcRenderer.removeListener("pty:output", listener);
  },
  onPtyExit: (callback) => {
    const listener = (_event, id, code) => callback(id, code);
    electron.ipcRenderer.on("pty:exit", listener);
    return () => electron.ipcRenderer.removeListener("pty:exit", listener);
  },
  onPtyCommand: (callback) => {
    const listener = (_event, id, command) => callback(id, command);
    electron.ipcRenderer.on(IPC.PTY_COMMAND, listener);
    return () => electron.ipcRenderer.removeListener(IPC.PTY_COMMAND, listener);
  },
  minimizeWindow: () => electron.ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  maximizeWindow: () => electron.ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
  closeWindow: () => electron.ipcRenderer.send(IPC.WINDOW_CLOSE)
};
electron.contextBridge.exposeInMainWorld("api", api);

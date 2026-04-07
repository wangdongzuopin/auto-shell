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
  CONFIG_GET_APPEARANCE: "config:get-appearance",
  CONFIG_SET_APPEARANCE: "config:set-appearance",
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
  WINDOW_CLOSE: "window:close",
  // Dialog
  DIALOG_OPEN_FOLDER: "dialog:open-folder",
  // Skills
  SKILLS_GET_ALL: "skills:get-all",
  SKILLS_GET_BY_PATH: "skills:get-by-path",
  // Sessions
  SESSION_SAVE: "session:save",
  SESSION_LOAD: "session:load",
  SESSION_LIST: "session:list",
  SESSION_DELETE: "session:delete",
  SESSION_LIST_ALL: "session:list-all",
  // Tools
  TOOL_READ: "tool:read",
  TOOL_WRITE: "tool:write",
  TOOL_GLOB: "tool:glob",
  TOOL_GREP: "tool:grep",
  TOOL_BASH: "tool:bash",
  TOOL_OPEN_URL: "tool:open-url",
  // MCP
  MCP_GET_SERVERS: "mcp:get-servers",
  MCP_GET_TOOLS: "mcp:get-tools",
  MCP_CALL_TOOL: "mcp:call-tool",
  MCP_DISCONNECT: "mcp:disconnect"
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
  getAppearance: () => electron.ipcRenderer.invoke(IPC.CONFIG_GET_APPEARANCE),
  setProvider: (provider) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER, provider),
  saveProviderConfig: (provider, config) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_PROVIDER_CONFIG, provider, config),
  saveTheme: (theme) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_THEME, theme),
  saveFeatures: (features) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_FEATURES, features),
  saveAppearance: (appearance) => electron.ipcRenderer.invoke(IPC.CONFIG_SET_APPEARANCE, appearance),
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
  closeWindow: () => electron.ipcRenderer.send(IPC.WINDOW_CLOSE),
  openFolderDialog: (title) => electron.ipcRenderer.invoke(IPC.DIALOG_OPEN_FOLDER, title),
  getSkillsFromDisk: () => electron.ipcRenderer.invoke(IPC.SKILLS_GET_ALL),
  getSkillByPath: (path) => electron.ipcRenderer.invoke(IPC.SKILLS_GET_BY_PATH, path),
  saveSession: (threadId, data) => electron.ipcRenderer.invoke(IPC.SESSION_SAVE, threadId, data),
  loadSession: (threadId) => electron.ipcRenderer.invoke(IPC.SESSION_LOAD, threadId),
  listSessions: () => electron.ipcRenderer.invoke(IPC.SESSION_LIST),
  deleteSession: (threadId) => electron.ipcRenderer.invoke(IPC.SESSION_DELETE, threadId),
  listAllSessions: () => electron.ipcRenderer.invoke(IPC.SESSION_LIST_ALL),
  // Tools
  readFile: (filePath) => electron.ipcRenderer.invoke(IPC.TOOL_READ, filePath),
  writeFile: (filePath, content) => electron.ipcRenderer.invoke(IPC.TOOL_WRITE, filePath, content),
  globFiles: (pattern, cwd) => electron.ipcRenderer.invoke(IPC.TOOL_GLOB, pattern, cwd),
  grepFiles: (pattern, cwd, options) => electron.ipcRenderer.invoke(IPC.TOOL_GREP, pattern, cwd, options),
  bashCommand: (command, cwd) => electron.ipcRenderer.invoke(IPC.TOOL_BASH, command, cwd),
  openUrl: (url) => electron.ipcRenderer.invoke(IPC.TOOL_OPEN_URL, url),
  // MCP
  getMCPServers: () => electron.ipcRenderer.invoke(IPC.MCP_GET_SERVERS),
  getMCPTools: (serverName) => electron.ipcRenderer.invoke(IPC.MCP_GET_TOOLS, serverName),
  callMCPTool: (serverName, toolName, args) => electron.ipcRenderer.invoke(IPC.MCP_CALL_TOOL, serverName, toolName, args),
  disconnectMCPServer: (serverName) => electron.ipcRenderer.invoke(IPC.MCP_DISCONNECT, serverName)
};
electron.contextBridge.exposeInMainWorld("api", api);

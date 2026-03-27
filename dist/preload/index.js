"use strict";
const electron = require("electron");
const IPC = {
  // AI
  AI_EXPLAIN_ERROR: "ai:explain-error",
  AI_NATURAL_CMD: "ai:natural-cmd",
  AI_EXPLAIN_CMD: "ai:explain-cmd",
  AI_CHECK_AVAILABLE: "ai:check-available",
  // Config
  CONFIG_GET: "config:get",
  CONFIG_SET: "config:set",
  KEY_SAVE: "key:save",
  KEY_GET: "key:get"
};
const api = {
  // AI
  checkAIAvailable: () => electron.ipcRenderer.invoke(IPC.AI_CHECK_AVAILABLE),
  explainError: (ctx) => electron.ipcRenderer.invoke(IPC.AI_EXPLAIN_ERROR, ctx),
  naturalToCommand: (input, shell) => electron.ipcRenderer.invoke(IPC.AI_NATURAL_CMD, input, shell),
  explainCommand: (command) => electron.ipcRenderer.invoke(IPC.AI_EXPLAIN_CMD, command),
  // Config
  getConfig: () => electron.ipcRenderer.invoke(IPC.CONFIG_GET),
  setConfig: (key, value) => electron.ipcRenderer.invoke(IPC.CONFIG_SET, key, value),
  // Keys
  getKey: (provider) => electron.ipcRenderer.invoke(IPC.KEY_GET, provider),
  saveKey: (provider, key) => electron.ipcRenderer.invoke(IPC.KEY_SAVE, provider, key),
  // PTY (placeholder for now)
  createPty: (shell, cwd) => electron.ipcRenderer.invoke("pty:create", shell, cwd),
  writePty: (id, data) => electron.ipcRenderer.send("pty:input", id, data),
  resizePty: (id, cols, rows) => electron.ipcRenderer.send("pty:resize", id, cols, rows),
  killPty: (id) => electron.ipcRenderer.send("pty:kill", id),
  onPtyOutput: (callback) => electron.ipcRenderer.on("pty:output", (event, id, data) => callback(id, data)),
  onPtyExit: (callback) => electron.ipcRenderer.on("pty:exit", (event, id, code) => callback(id, code))
};
electron.contextBridge.exposeInMainWorld("api", api);

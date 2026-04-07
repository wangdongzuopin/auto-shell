import { ipcMain, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createProvider, ProviderConfig } from '../ai';
import { IPC } from '../shared/ipc-channels';
import type {
  AppearanceSettings,
  ChatMessage,
  FeatureToggles,
  ProviderSettings,
  ProviderType,
  TerminalSession,
  Theme
} from '../shared/types';
import {
  getApiKey,
  getAppearance,
  getConfig,
  getTerminalSession,
  recordTerminalCommand,
  saveApiKey,
  saveTerminalSession,
  setAppearance,
  setFeatures,
  setProvider,
  setProviderConfig,
  setTheme
} from './session-store';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  loadAllSessions,
} from './session-persistence';
import {
  getMCPConfig,
  getConnectedServers,
  getServerTools,
  callMCPTool,
  disconnectMCPServer,
} from './mcp';

let currentProvider: ReturnType<typeof createProvider> | null = null;

async function getProvider() {
  if (currentProvider) {
    return currentProvider;
  }

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

  ipcMain.handle(IPC.CONFIG_GET_APPEARANCE, () => getAppearance());

  ipcMain.handle(IPC.CONFIG_SET_APPEARANCE, (_event, appearance: AppearanceSettings) => {
    setAppearance(appearance);
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

    return safeExists(targetPath);
  });

  ipcMain.handle(IPC.PATH_RESOLVE_PROJECT, async (_event, input: string) => {
    return findProjectCandidates(input, 1)[0] ?? null;
  });

  ipcMain.handle(IPC.PATH_FIND_PROJECT_CANDIDATES, async (_event, input: string) => {
    return findProjectCandidates(input, 5);
  });

  ipcMain.handle(IPC.TERMINAL_SESSION_GET, () => getTerminalSession());

  ipcMain.handle(IPC.TERMINAL_SESSION_SAVE, (_event, session: TerminalSession) => {
    saveTerminalSession(session);
    return true;
  });

  ipcMain.handle(IPC.TERMINAL_HISTORY_RECORD, (_event, cwd: string, command: string) => {
    recordTerminalCommand(cwd, command);
    return true;
  });

  ipcMain.handle(IPC.DIALOG_OPEN_FOLDER, async (_event, title: string) => {
    const result = await dialog.showOpenDialog({
      title,
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Skill loading handlers
  ipcMain.handle(IPC.SKILLS_GET_ALL, async () => {
    return loadSkillsFromDisk();
  });

  ipcMain.handle(IPC.SKILLS_GET_BY_PATH, async (_event, skillPath: string) => {
    return loadSkillByPath(skillPath);
  });

  // Session handlers
  ipcMain.handle(IPC.SESSION_SAVE, (_event, threadId: string, data: unknown) => {
    saveSession(threadId, data);
    return true;
  });

  ipcMain.handle(IPC.SESSION_LOAD, (_event, threadId: string) => {
    return loadSession(threadId);
  });

  ipcMain.handle(IPC.SESSION_LIST, () => {
    return listSessions();
  });

  ipcMain.handle(IPC.SESSION_DELETE, (_event, threadId: string) => {
    deleteSession(threadId);
    return true;
  });

  ipcMain.handle(IPC.SESSION_LIST_ALL, () => {
    return loadAllSessions();
  });

  // Tool handlers
  ipcMain.handle(IPC.TOOL_READ, async (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TOOL_WRITE, async (_event, filePath: string, content: string) => {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TOOL_GLOB, async (_event, pattern: string, cwd: string) => {
    try {
      // Simple glob implementation
      const results: string[] = [];
      const normalizedCwd = cwd || process.cwd();

      function matchPattern(filePath: string, pattern: string): boolean {
        const parts = pattern.split('/');
        const fileParts = filePath.replace(/\\/g, '/').split('/');
        let fileIndex = 0;

        for (const part of parts) {
          if (part === '**') {
            // Match any depth
            if (fileIndex >= fileParts.length) return false;
            continue;
          }
          if (part === '*') {
            // Match anything except /
            if (fileIndex >= fileParts.length || fileParts[fileIndex].includes('/')) return false;
            fileIndex++;
            continue;
          }
          if (part.includes('*')) {
            // Simple wildcard at end
            const regex = new RegExp('^' + part.replace(/\*/g, '.*') + '$');
            if (fileIndex >= fileParts.length || !regex.test(fileParts[fileIndex])) return false;
            fileIndex++;
            continue;
          }
          if (fileIndex >= fileParts.length || fileParts[fileIndex] !== part) return false;
          fileIndex++;
        }
        return fileIndex === fileParts.length || parts[parts.length - 1] === '**';
      }

      function walkDir(dir: string, depth: number = 0) {
        if (depth > 10) return; // Prevent too deep recursion
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              walkDir(fullPath, depth + 1);
            } else if (entry.isFile()) {
              const relativePath = path.relative(normalizedCwd, fullPath).replace(/\\/g, '/');
              if (matchPattern(relativePath, pattern) || matchPattern(entry.name, pattern)) {
                results.push(fullPath);
              }
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      walkDir(normalizedCwd);
      return { success: true, matches: results.slice(0, 100) };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TOOL_GREP, async (_event, pattern: string, cwd: string, options?: { ext?: string[] }) => {
    try {
      const results: Array<{ file: string; line: number; content: string }> = [];
      const normalizedCwd = cwd || process.cwd();
      const regex = new RegExp(pattern, 'i');

      function walkDir(dir: string, depth: number = 0) {
        if (depth > 10) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              // Skip node_modules and hidden directories
              if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                walkDir(fullPath, depth + 1);
              }
            } else if (entry.isFile()) {
              // Filter by extension if specified
              if (options?.ext && options.ext.length > 0) {
                const ext = path.extname(entry.name).slice(1);
                if (!options.ext.includes(ext)) continue;
              }
              try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                  if (regex.test(line)) {
                    results.push({
                      file: fullPath,
                      line: index + 1,
                      content: line.trim(),
                    });
                  }
                });
              } catch {
                // Skip files we can't read
              }
            }
          }
        } catch {
          // Skip directories we can't read
        }
      }

      walkDir(normalizedCwd);
      return { success: true, matches: results.slice(0, 100) };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.TOOL_BASH, async (_event, command: string, cwd?: string) => {
    return new Promise((resolve) => {
      const pty = require('node-pty');
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const cwdArg = cwd || os.homedir();

      try {
        const p = pty.spawn(shell, [], {
          cwd: cwdArg,
          env: process.env as { [key: string]: string },
        });

        let output = '';
        let timeout: NodeJS.Timeout;

        const cleanup = () => {
          clearTimeout(timeout);
          try { p.kill(); } catch {}
        };

        timeout = setTimeout(() => {
          cleanup();
          resolve({ exitCode: -1, output: 'Command timed out after 30 seconds' });
        }, 30000);

        p.onData((data: string) => {
          output += data;
        });

        p.onExit(({ exitCode }: { exitCode: number }) => {
          cleanup();
          resolve({ exitCode: exitCode || 0, output });
        });

        p.write(command + '\r');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        resolve({ exitCode: -1, output: '', error: message });
      }
    });
  });

  ipcMain.handle(IPC.TOOL_OPEN_URL, async (_event, url: string) => {
    try {
      // Validate URL format
      if (!url || typeof url !== 'string') {
        return { success: false, error: 'Invalid URL' };
      }

      // Add protocol if missing
      let targetUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        targetUrl = 'https://' + url;
      }

      // Validate URL format and protocol
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(targetUrl);
      } catch {
        return { success: false, error: `Invalid URL format: ${url}` };
      }

      // Validate URL protocol for security
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return { success: false, error: `Invalid URL protocol: must use http:// or https://, got ${parsedUrl.protocol}` };
      }

      // Use cross-platform browser opening like reference project
      const { execFile } = require('child_process');
      const platform = process.platform;

      // Helper to wrap execFile in promise
      const execFilePromise = (file: string, args: string[]): Promise<{ code: number }> => {
        return new Promise((resolve) => {
          execFile(file, args, { shell: true }, (error: Error | null, _stdout: string, _stderr: string) => {
            resolve({ code: error ? 1 : 0 });
          });
        });
      };

      if (platform === 'win32') {
        // On Windows, use rundll32 to open URL
        const { code } = await execFilePromise('rundll32', ['url,OpenURL', targetUrl]);
        return { success: code === 0 };
      } else if (platform === 'darwin') {
        // On macOS, use open command
        const { code } = await execFilePromise('open', [targetUrl]);
        return { success: code === 0 };
      } else {
        // On Linux, use xdg-open
        const { code } = await execFilePromise('xdg-open', [targetUrl]);
        return { success: code === 0 };
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  // MCP handlers
  ipcMain.handle(IPC.MCP_GET_SERVERS, () => {
    return getConnectedServers();
  });

  ipcMain.handle(IPC.MCP_GET_TOOLS, (_event, serverName: string) => {
    return getServerTools(serverName);
  });

  ipcMain.handle(IPC.MCP_CALL_TOOL, async (_event, serverName: string, toolName: string, args: Record<string, unknown>) => {
    try {
      const result = await callMCPTool(serverName, toolName, args);
      return { success: true, result };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  });

  ipcMain.handle(IPC.MCP_DISCONNECT, (_event, serverName: string) => {
    disconnectMCPServer(serverName);
    return true;
  });
}

function findProjectCandidates(input: string, limit: number): string[] {
  const normalizedInput = input.trim();
  if (!normalizedInput) {
    return [];
  }

  const explicitPath = normalizeExplicitPath(normalizedInput);
  if (explicitPath && safeExists(explicitPath)) {
    return [explicitPath];
  }

  const driveHint = extractDriveHint(normalizedInput);
  const tokens = extractProjectTokens(normalizedInput);
  if (tokens.length === 0) {
    return [];
  }

  const roots = getSearchRoots(driveHint);
  const matches = new Map<string, { path: string; score: number; depth: number }>();

  for (const root of roots) {
    for (const candidate of resolveFromRoot(root, tokens, limit)) {
      const existing = matches.get(candidate.path);
      if (!existing || candidate.score > existing.score || candidate.depth < existing.depth) {
        matches.set(candidate.path, candidate);
      }
    }
  }

  return [...matches.values()]
    .sort((a, b) => b.score - a.score || a.depth - b.depth || a.path.length - b.path.length)
    .slice(0, limit)
    .map((item) => item.path);
}

function normalizeExplicitPath(input: string): string | null {
  const cleaned = input
    .replace(/[。！!？?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return null;
  }

  if (/^[a-zA-Z]:/.test(cleaned)) {
    return cleaned.replace(/\//g, '\\');
  }

  const driveChineseMatch = cleaned.match(/^([a-zA-Z])盘[:：]?[\\/]*(.*)$/i);
  if (driveChineseMatch) {
    const rest = driveChineseMatch[2].trim().replace(/[\\/]+/g, '\\');
    return rest ? `${driveChineseMatch[1].toUpperCase()}:\\${rest}` : `${driveChineseMatch[1].toUpperCase()}:\\`;
  }

  if (cleaned.startsWith('~') || cleaned.startsWith('/') || cleaned.startsWith('\\')) {
    return cleaned;
  }

  return null;
}

function extractDriveHint(input: string): string | null {
  const directMatch = input.match(/([a-zA-Z]):/);
  if (directMatch) {
    return `${directMatch[1].toUpperCase()}:\\`;
  }

  const chineseMatch = input.match(/([a-zA-Z])盘/i);
  if (chineseMatch) {
    return `${chineseMatch[1].toUpperCase()}:\\`;
  }

  return null;
}

function extractProjectTokens(input: string): string[] {
  const sanitized = input
    .replace(/[。！!？?]+$/g, ' ')
    .replace(/([a-zA-Z])盘/gi, ' ')
    .replace(/[\\/]+/g, ' ')
    .replace(/[:：]/g, ' ')
    .replace(/\b(cd|chdir|set-location|open|goto)\b/gi, ' ')
    .replace(/切换到|切到|进入|打开项目|打开|前往|去到|跳到|项目|目录|文件夹|路径|下面|下的|里的|里边的|中的|的/gi, ' ');

  const rawTokens = sanitized.match(/[A-Za-z0-9._-]+|[\u4e00-\u9fa5]{2,}/g) ?? [];
  const stopwords = new Set(['盘', '项目', '目录', '文件夹', '路径']);

  return rawTokens
    .map((token) => token.trim())
    .filter((token) => token && !stopwords.has(token))
    .filter((token, index, all) => all.findIndex((item) => item.toLowerCase() === token.toLowerCase()) === index);
}

function getSearchRoots(driveHint: string | null): string[] {
  if (driveHint) {
    return safeExists(driveHint) ? [driveHint] : [];
  }

  const roots: string[] = [];
  for (const letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
    const candidate = `${letter}:\\`;
    if (safeExists(candidate)) {
      roots.push(candidate);
    }
  }

  return roots;
}

function resolveFromRoot(
  root: string,
  tokens: string[],
  limit: number
): Array<{ path: string; score: number; depth: number }> {
  let candidates = [{ path: root, score: 0, depth: 0 }];

  for (const token of tokens) {
    const next = new Map<string, { path: string; score: number; depth: number }>();

    for (const candidate of candidates) {
      for (const match of findMatchingDirectories(candidate.path, token, 3, limit)) {
        const score = candidate.score + match.score;
        const existing = next.get(match.path);
        if (!existing || score > existing.score || match.depth < existing.depth) {
          next.set(match.path, {
            path: match.path,
            score,
            depth: candidate.depth + match.depth
          });
        }
      }
    }

    if (next.size === 0) {
      return [];
    }

    candidates = [...next.values()]
      .sort((a, b) => b.score - a.score || a.depth - b.depth || a.path.length - b.path.length)
      .slice(0, Math.max(limit, 6));
  }

  return candidates;
}

function findMatchingDirectories(
  baseDir: string,
  token: string,
  maxDepth: number,
  limit: number
): Array<{ path: string; depth: number; score: number }> {
  const results: Array<{ path: string; depth: number; score: number }> = [];
  const normalizedToken = token.toLowerCase();

  const walk = (currentDir: string, depth: number) => {
    if (depth > maxDepth || results.length >= 50) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const directories = entries.filter((entry) => entry.isDirectory());
    const ranked = directories
      .map((entry) => ({ entry, score: matchDirectoryName(entry.name, normalizedToken) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length);

    for (const item of ranked.slice(0, Math.max(limit, 5))) {
      results.push({
        path: path.join(currentDir, item.entry.name),
        depth,
        score: item.score
      });
    }

    for (const directory of directories) {
      walk(path.join(currentDir, directory.name), depth + 1);
    }
  };

  walk(baseDir, 1);
  return results;
}

function matchDirectoryName(name: string, token: string): number {
  const normalizedName = name.toLowerCase();

  if (normalizedName === token) {
    return 100;
  }

  if (normalizedName.startsWith(token)) {
    return 80;
  }

  if (normalizedName.includes(token)) {
    return 60;
  }

  return 0;
}

function safeExists(targetPath: string): boolean {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

// Skill loading functions
interface DiskSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  mode: string;
  enabled: boolean;
  createdAt: number;
}

function getSkillsBaseDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)---\s*\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      frontmatter[key] = value;
    }
  }

  return { frontmatter, body: match[2] };
}

function loadSkillByPath(skillDirPath: string): DiskSkill | null {
  const skillFilePath = path.join(skillDirPath, 'SKILL.md');
  if (!safeExists(skillFilePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(skillFilePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);

    return {
      id: path.basename(skillDirPath),
      name: frontmatter.name || path.basename(skillDirPath),
      description: frontmatter.description || '',
      icon: frontmatter.icon || '🛠️',
      path: skillDirPath,
      mode: frontmatter.mode || 'work',
      enabled: true,
      createdAt: safeExists(skillDirPath) ? fs.statSync(skillDirPath).mtimeMs : Date.now(),
    };
  } catch {
    return null;
  }
}

function loadSkillsFromDisk(): DiskSkill[] {
  const skillsDir = getSkillsBaseDir();
  if (!safeExists(skillsDir)) {
    return [];
  }

  const skills: DiskSkill[] = [];

  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillDirPath = path.join(skillsDir, entry.name);
        const skill = loadSkillByPath(skillDirPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }
  } catch {
    // Return empty array on error
  }

  return skills;
}

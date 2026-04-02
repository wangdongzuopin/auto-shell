import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
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

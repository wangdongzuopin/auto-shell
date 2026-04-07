import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SESSIONS_DIR = path.join(os.homedir(), '.autoshell', 'sessions');

export function getSessionsDir(): string {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
  return SESSIONS_DIR;
}

export function saveSession(threadId: string, data: unknown): void {
  const sessionsDir = getSessionsDir();
  const filePath = path.join(sessionsDir, `${threadId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadSession(threadId: string): unknown | null {
  const filePath = path.join(getSessionsDir(), `${threadId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function listSessions(): string[] {
  const sessionsDir = getSessionsDir();
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  return fs.readdirSync(sessionsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

export function deleteSession(threadId: string): void {
  const filePath = path.join(getSessionsDir(), `${threadId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function loadAllSessions(): unknown[] {
  const sessionsDir = getSessionsDir();
  if (!fs.existsSync(sessionsDir)) {
    return [];
  }
  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith('.json'));
  const sessions: unknown[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(sessionsDir, file), 'utf-8');
      sessions.push(JSON.parse(content));
    } catch {
      // Skip invalid files
    }
  }
  return sessions;
}

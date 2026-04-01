export interface CommandPattern {
  pattern: RegExp;
  type: 'install' | 'download' | 'build' | 'git' | 'docker' | 'general';
  estimator: 'npm' | 'cargo' | 'curl' | 'time' | 'none';
}

export const COMMAND_PATTERNS: CommandPattern[] = [
  // 安装类
  { pattern: /^npm\s+(install|ci|add)/, type: 'install', estimator: 'npm' },
  { pattern: /^yarn\s+(add|install)/, type: 'install', estimator: 'npm' },
  { pattern: /^pnpm\s+(add|install)/, type: 'install', estimator: 'npm' },
  { pattern: /^pip\s+(install|download)/, type: 'install', estimator: 'cargo' },
  { pattern: /^cargo\s+(build|install|fetch)/, type: 'install', estimator: 'cargo' },
  { pattern: /^gem\s+install/, type: 'install', estimator: 'cargo' },

  // 下载类
  { pattern: /^curl\s+-/, type: 'download', estimator: 'curl' },
  { pattern: /^wget\s+-/, type: 'download', estimator: 'curl' },

  // 构建类
  { pattern: /^make(\s|$)/, type: 'build', estimator: 'time' },
  { pattern: /^cmake\s+/, type: 'build', estimator: 'time' },
  { pattern: /^gradle\s+/, type: 'build', estimator: 'time' },
  { pattern: /^mvn\s+/, type: 'build', estimator: 'time' },

  // Git 类
  { pattern: /^git\s+clone/, type: 'git', estimator: 'curl' },
  { pattern: /^git\s+(pull|fetch|checkout)/, type: 'git', estimator: 'time' },

  // Docker 类
  { pattern: /^docker\s+(build|pull|run)/, type: 'docker', estimator: 'curl' },
];

export interface ClassifiedCommand {
  raw: string;
  type: CommandPattern['type'];
  estimator: CommandPattern['estimator'];
  isLongRunning: boolean;
}

export function classifyCommand(command: string): ClassifiedCommand | null {
  const trimmed = command.trim();

  for (const cp of COMMAND_PATTERNS) {
    if (cp.pattern.test(trimmed)) {
      return {
        raw: trimmed,
        type: cp.type,
        estimator: cp.estimator,
        isLongRunning: true,
      };
    }
  }

  return null;
}

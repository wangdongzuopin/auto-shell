import { ipcMain } from 'electron';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as pty from 'node-pty';
import { IPC } from '@shared/ipc-channels';

interface PtyInstance {
  id: string;
  pty: pty.IPty;
  currentCommand: string;
}

const instances = new Map<string, PtyInstance>();

function resolveCwd(cwd: string): string {
  if (!cwd || cwd === '~') {
    return os.homedir();
  }
  if (cwd.startsWith('~')) {
    return cwd.replace('~', os.homedir());
  }
  return cwd;
}

export function registerPtyHandlers() {
  ipcMain.handle('pty:create', async (event, id: string, shell: string, cwd: string) => {
    const existing = instances.get(id);
    if (existing) {
      existing.pty.kill();
      instances.delete(id);
    }

    const { file, args } = getShellLaunchConfig(shell);
    const ptyProcess = pty.spawn(file, args, {
      cwd: resolveCwd(cwd),
      cols: 80,
      rows: 24,
      name: 'xterm-256color'
    });

    ptyProcess.onData((data) => {
      event.sender.send('pty:output', id, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      event.sender.send('pty:exit', id, exitCode);
      instances.delete(id);
    });

    instances.set(id, { id, pty: ptyProcess, currentCommand: '' });
    return id;
  });

  ipcMain.on('pty:input', (event, id: string, data: string) => {
    const instance = instances.get(id);
    if (!instance) return;

    // 检测命令结束（换行）
    if (data === '\r' || data === '\n') {
      const cmd = instance.currentCommand.trim();
      if (cmd.length > 0) {
        event.sender.send(IPC.PTY_COMMAND, id, cmd);
      }
      instance.currentCommand = '';
    } else if (data === '\u007f') {
      // Backspace
      instance.currentCommand = instance.currentCommand.slice(0, -1);
    } else if (data.length === 1 && !data.match(/\x00-\x1f/)) {
      // printable character
      instance.currentCommand += data;
    }

    instance.pty.write(data);
  });

  ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
    instances.get(id)?.pty.resize(cols, rows);
  });

  ipcMain.on('pty:kill', (_event, id: string) => {
    const instance = instances.get(id);
    if (!instance) {
      return;
    }

    instance.pty.kill();
    instances.delete(id);
  });
}

function getShellLaunchConfig(shell: string): { file: string; args: string[] } {
  if (process.platform === 'darwin') {
    switch (shell) {
      case 'bash':
        return {
          file: '/bin/bash',
          args: ['--login']
        };
      case 'zsh':
      default:
        return {
          file: '/bin/zsh',
          args: ['-l']
        };
    }
  }

  if (process.platform === 'linux') {
    switch (shell) {
      case 'zsh':
        return {
          file: '/bin/zsh',
          args: ['-l']
        };
      case 'bash':
      default:
        return {
          file: '/bin/bash',
          args: ['--login']
        };
    }
  }

  switch (shell) {
    case 'cmd':
      return {
        file: process.env.ComSpec || 'cmd.exe',
        args: ['/k', 'chcp', '65001']
      };
    case 'wsl':
      return {
        file: 'wsl.exe',
        args: []
      };
    case 'git-bash':
    case 'bash':
      return {
        file: resolveGitBashExecutable(),
        args: ['--login']
      };
    case 'powershell':
    default:
      return {
        file: resolvePowerShellExecutable(),
        args: [
          '-NoLogo',
          '-NoExit',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          'try { chcp 65001 > $null } catch {}; try { [Console]::InputEncoding=[System.Text.UTF8Encoding]::new($false) } catch {}; try { [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false) } catch {}'
        ]
      };
  }
}

function resolvePowerShellExecutable(): string {
  const pwshPath = findExistingPath([
    path.join(process.env.ProgramFiles || '', 'PowerShell', '7', 'pwsh.exe'),
    path.join(process.env.ProgramFiles || '', 'PowerShell', '6', 'pwsh.exe')
  ]);

  if (pwshPath) {
    return pwshPath;
  }

  return 'powershell.exe';
}

function resolveGitBashExecutable(): string {
  const gitBashPath = findExistingPath([
    path.join(process.env.ProgramFiles || '', 'Git', 'bin', 'bash.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Git', 'bin', 'bash.exe')
  ]);

  if (gitBashPath) {
    return gitBashPath;
  }

  return 'bash.exe';
}

function findExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

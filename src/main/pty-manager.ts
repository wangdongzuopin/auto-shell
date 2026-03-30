import { ipcMain } from 'electron';
import * as os from 'os';
import * as pty from 'node-pty';

interface PtyInstance {
  id: string;
  pty: pty.IPty;
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

    instances.set(id, { id, pty: ptyProcess });
    return id;
  });

  ipcMain.on('pty:input', (_event, id: string, data: string) => {
    instances.get(id)?.pty.write(data);
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
  switch (shell) {
    case 'powershell':
      return {
        file: 'powershell.exe',
        args: [
          '-NoLogo',
          '-NoExit',
          '-Command',
          "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new(); [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); chcp 65001 > $null"
        ]
      };
    case 'cmd':
      return {
        file: 'cmd.exe',
        args: ['/k', 'chcp', '65001']
      };
    case 'wsl':
      return {
        file: 'wsl.exe',
        args: []
      };
    case 'git-bash':
      return {
        file: 'bash.exe',
        args: ['--login']
      };
    default:
      return {
        file: 'powershell.exe',
        args: [
          '-NoLogo',
          '-NoExit',
          '-Command',
          "[Console]::InputEncoding=[System.Text.UTF8Encoding]::new(); [Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); chcp 65001 > $null"
        ]
      };
  }
}

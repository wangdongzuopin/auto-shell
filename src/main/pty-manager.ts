// PTY Manager stub - 实现请参考 TDD 文档
import { ipcMain } from 'electron';
import * as pty from 'node-pty';
import { IPC } from '../shared/ipc-channels';

interface PtyInstance {
  id: string;
  pty: pty.IPty;
  output: string;
}

const instances = new Map<string, PtyInstance>();

export function registerPtyHandlers() {
  ipcMain.handle('pty:create', async (event, shell: string, cwd: string) => {
    const id = Math.random().toString(36).slice(2);

    const shellProgram = getShellProgram(shell);
    const ptyProcess = pty.spawn(shellProgram, [], {
      cwd,
      cols: 80,
      rows: 24
    });

    ptyProcess.onData((data) => {
      event.sender.send('pty:output', id, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      event.sender.send('pty:exit', id, exitCode);
      instances.delete(id);
    });

    instances.set(id, { id, pty: ptyProcess, output: '' });
    return id;
  });

  ipcMain.on('pty:input', (event, id: string, data: string) => {
    const instance = instances.get(id);
    if (instance) {
      instance.pty.write(data);
    }
  });

  ipcMain.on('pty:resize', (event, id: string, cols: number, rows: number) => {
    const instance = instances.get(id);
    if (instance) {
      instance.pty.resize(cols, rows);
    }
  });

  ipcMain.on('pty:kill', (event, id: string) => {
    const instance = instances.get(id);
    if (instance) {
      instance.pty.kill();
      instances.delete(id);
    }
  });
}

function getShellProgram(shell: string): string {
  switch (shell) {
    case 'powershell':
      return 'powershell.exe';
    case 'cmd':
      return 'cmd.exe';
    case 'wsl':
      return 'wsl.exe';
    case 'git-bash':
      return 'bash.exe';
    default:
      return 'powershell.exe';
  }
}

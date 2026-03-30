import { useCallback, useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import type { Theme } from '../store/settings';

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tabId: string,
  shell: string = 'powershell',
  cwd: string = '',
  theme?: Theme,
  onSelectionChange?: (selection: string, position: { x: number; y: number }) => void
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeFrameRef = useRef<number | null>(null);

  const resizePty = useCallback(() => {
    if (!terminalRef.current) {
      return;
    }

    window.api.resizePty(tabId, terminalRef.current.cols, terminalRef.current.rows);
  }, [tabId]);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const terminal = new Terminal({
      fontFamily: 'Consolas, IBM Plex Mono, Cascadia Mono, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      theme: {
        background: theme?.background ?? '#0f1115',
        foreground: theme?.foreground ?? '#d8dee9',
        cursor: theme?.accent ?? '#4c8dff',
        cursorAccent: getCursorAccent(theme?.background ?? '#0f1115'),
        selectionBackground: withAlpha(theme?.accent ?? '#4c8dff', '3d')
      }
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    if (onSelectionChange) {
      let selectionTimeout: ReturnType<typeof setTimeout>;
      terminal.onSelectionChange(() => {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
          const selection = terminal.getSelection().trim();
          if (!selection || selection.length < 3) {
            return;
          }

          onSelectionChange(selection, {
            x: terminal.buffer.active.cursorX * 8,
            y: terminal.buffer.active.cursorY * 20
          });
        }, 180);
      });
    }

    terminal.open(containerRef.current);
    fitAddon.fit();
    terminal.focus();

    terminal.onData((data) => {
      window.api.writePty(tabId, data);
    });

    const disposeOutput = window.api.onPtyOutput((id, data) => {
      if (id === tabId) {
        terminal.write(data);
      }
    });

    const disposeExit = window.api.onPtyExit((id, code) => {
      if (id === tabId) {
        terminal.writeln(`\r\n[process exited with code ${code}]`);
      }
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const handleClick = () => terminal.focus();
    containerRef.current.addEventListener('mousedown', handleClick);

    void window.api.createPty(tabId, shell, cwd || '~').then(() => {
      fitAddon.fit();
      resizePty();
    }).catch((error) => {
      console.error('Failed to create PTY:', error);
      terminal.writeln('\r\n[failed to start shell]');
    });

    const resizeObserver = new ResizeObserver(() => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = requestAnimationFrame(() => {
        fitAddon.fit();
        resizePty();
        resizeFrameRef.current = null;
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('mousedown', handleClick);
      disposeOutput();
      disposeExit();
      window.api.killPty(tabId);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerRef, onSelectionChange, resizePty, shell, tabId, theme]);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return {
    focus
  };
}

function getCursorAccent(background: string): string {
  return isLightColor(background) ? '#f6f8fc' : background;
}

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function isLightColor(hex: string): boolean {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.72;
}

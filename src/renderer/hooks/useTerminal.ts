import { useCallback, useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import type { Theme } from '../store/settings';
import type { AppearanceSettings } from '../../shared/types';

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tabId: string,
  shell: string = 'powershell',
  cwd: string = '',
  theme?: Theme,
  appearance?: AppearanceSettings,
  onSelectionChange?: (selection: string, position: { x: number; y: number }) => void,
  onCommandStart?: (command: string) => void,
  onCommandComplete?: () => void
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const callbacksRef = useRef({
    onSelectionChange,
    onCommandStart,
    onCommandComplete
  });

  useEffect(() => {
    callbacksRef.current = {
      onSelectionChange,
      onCommandStart,
      onCommandComplete
    };
  }, [onSelectionChange, onCommandStart, onCommandComplete]);

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
      theme: createTerminalTheme(theme, appearance)
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    let selectionTimeout: ReturnType<typeof setTimeout> | undefined;
    if (callbacksRef.current.onSelectionChange) {
      terminal.onSelectionChange(() => {
        if (selectionTimeout) {
          clearTimeout(selectionTimeout);
        }
        selectionTimeout = setTimeout(() => {
          const selection = terminal.getSelection().trim();
          if (!selection || selection.length < 3) {
            return;
          }

          callbacksRef.current.onSelectionChange?.(selection, {
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
        callbacksRef.current.onCommandComplete?.();
      }
    });

    // Command detection
    const disposeCommand = window.api.onPtyCommand((id, command) => {
      if (id === tabId) {
        callbacksRef.current.onCommandStart?.(command);
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
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      if (resizeFrameRef.current !== null) {
        cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('mousedown', handleClick);
      disposeOutput();
      disposeExit();
      disposeCommand();
      window.api.killPty(tabId);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [containerRef, resizePty, shell, tabId]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.options.theme = createTerminalTheme(theme, appearance);
  }, [appearance, theme]);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return {
    focus
  };
}

function createTerminalTheme(theme?: Theme, appearance?: AppearanceSettings) {
  const background = theme?.background ?? '#0f1115';
  const accent = theme?.accent ?? '#4c8dff';
  const foreground = theme?.foreground ?? '#d8dee9';
  const light = isLightColor(background);
  const terminalBackground = appearance?.terminalTransparency
    ? hexToRgba(background, Math.max(appearance.terminalOpacity * 0.14, 0.04))
    : background;

  return {
    background: terminalBackground,
    foreground,
    cursor: accent,
    cursorAccent: getCursorAccent(background),
    selectionBackground: withAlpha(accent, light ? '26' : '3d'),
    black: light ? '#4b5563' : '#1f2430',
    red: light ? '#c2410c' : '#f7768e',
    green: light ? '#0f766e' : '#9ece6a',
    yellow: light ? '#a16207' : '#e0af68',
    blue: light ? '#2563eb' : '#7aa2f7',
    magenta: light ? '#a21caf' : '#bb9af7',
    cyan: light ? '#0f766e' : '#7dcfff',
    white: foreground,
    brightBlack: light ? '#64748b' : '#414868',
    brightRed: light ? '#dc2626' : '#f7768e',
    brightGreen: light ? '#059669' : '#9ece6a',
    brightYellow: light ? '#b45309' : '#e0af68',
    brightBlue: light ? '#1d4ed8' : '#7aa2f7',
    brightMagenta: light ? '#9333ea' : '#c0a8ff',
    brightCyan: light ? '#0891b2' : '#89ddff',
    brightWhite: light ? '#0f172a' : '#d8dee9'
  };
}

function getCursorAccent(background: string): string {
  return isLightColor(background) ? '#f6f8fc' : background;
}

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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

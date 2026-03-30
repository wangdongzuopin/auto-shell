import { useCallback, useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tabId: string,
  shell: string = 'powershell',
  cwd: string = '',
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
        background: '#0f1115',
        foreground: '#d8dee9',
        cursor: '#4c8dff',
        cursorAccent: '#0f1115',
        selectionBackground: 'rgba(76, 141, 255, 0.24)'
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
  }, [containerRef, onSelectionChange, resizePty, shell, tabId]);

  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return {
    focus
  };
}

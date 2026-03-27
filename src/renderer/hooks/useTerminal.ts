import { useCallback, useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  tabId: string,
  onSelectionChange?: (selection: string, position: { x: number; y: number }) => void
) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const writeOutput = useCallback((data: string) => {
    terminalRef.current?.write(data);
  }, []);

  const clearTerminal = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const focusInput = useCallback(() => {
    // Focus input bar component
  }, []);

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const term = new Terminal({
      fontFamily: 'IBM Plex Mono, Consolas, monospace',
      fontSize: 14,
      theme: {
        background: '#0e0f11',
        foreground: '#c9cdd6',
        cursor: '#7c6af7',
        cursorAccent: '#0e0f11',
        selectionBackground: 'rgba(124, 106, 247, 0.3)'
      },
      cursorBlink: true,
      cursorStyle: 'block'
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Handle text selection
    if (onSelectionChange) {
      let selectionTimeout: ReturnType<typeof setTimeout>;
      term.onSelectionChange(() => {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
          const selection = term.getSelection().trim();
          if (selection && selection.length >= 3) {
            // Get cursor position for tooltip placement
            const cursorX = term.buffer.active.cursorX;
            const cursorY = term.buffer.active.cursorY;
            onSelectionChange(selection, { x: cursorX * 8, y: cursorY * 20 });
          }
        }, 300);
      });
    }

    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
    };
  }, [containerRef, onSelectionChange]);

  const resize = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return {
    terminal: terminalRef.current,
    writeOutput,
    clearTerminal,
    focusInput,
    resize
  };
}

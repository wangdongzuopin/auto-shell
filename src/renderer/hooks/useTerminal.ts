import { useCallback, useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useTabsStore } from '../store/tabs';

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>, tabId: string) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const writeOutput = useCallback((data: string) => {
    terminalRef.current?.write(data);
  }, []);

  const clearTerminal = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const focusInput = useCallback(() => {
    // This would typically focus the input bar component
    // For now, just ensure terminal is visible
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
  }, [containerRef]);

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

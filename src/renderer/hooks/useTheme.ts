import { useCallback } from 'react';
import { useSettingsStore, Theme } from '../store/settings';

const BUILT_IN_THEMES: Theme[] = [
  {
    name: 'NexTerm Dark',
    background: '#0e0f11',
    foreground: '#c9cdd6',
    accent: '#7c6af7'
  },
  {
    name: 'Catppuccin',
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    accent: '#cba6f7'
  },
  {
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    accent: '#bd93f9'
  },
  {
    name: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#c0caf5',
    accent: '#7aa2f7'
  },
  {
    name: 'Nord',
    background: '#2e3440',
    foreground: '#eceff4',
    accent: '#81a1c1'
  },
  {
    name: 'Monokai',
    background: '#272822',
    foreground: '#f8f8f2',
    accent: '#f92672'
  }
];

export function useTheme() {
  const { theme, setTheme } = useSettingsStore();

  const applyTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    document.documentElement.style.setProperty('--bg', newTheme.background);
    document.documentElement.style.setProperty('--bg2', lighten(newTheme.background, 8));
    document.documentElement.style.setProperty('--bg3', lighten(newTheme.background, 16));
    document.documentElement.style.setProperty('--bg4', lighten(newTheme.background, 24));
    document.documentElement.style.setProperty('--accent', newTheme.accent);
    if (newTheme.foreground) {
      document.documentElement.style.setProperty('--text', newTheme.foreground);
    }
  }, [setTheme]);

  const getBuiltInThemes = useCallback(() => BUILT_IN_THEMES, []);

  return {
    currentTheme: theme,
    applyTheme,
    getBuiltInThemes
  };
}

function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

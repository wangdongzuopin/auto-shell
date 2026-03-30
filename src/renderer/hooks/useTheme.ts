import { useCallback } from 'react';
import { useSettingsStore, Theme } from '../store/settings';

const BUILT_IN_THEMES: Theme[] = [
  {
    name: 'Auto Shell Dark',
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
    void setTheme(newTheme);
  }, [setTheme]);

  const getBuiltInThemes = useCallback(() => BUILT_IN_THEMES, []);

  return {
    currentTheme: theme,
    applyTheme,
    getBuiltInThemes
  };
}

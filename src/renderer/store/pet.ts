import { create } from 'zustand';

export type PetMode = 'idle' | 'working' | 'sleeping';

interface PetState {
  mode: PetMode;
  currentCommand: string | null;
  windowFocused: boolean;
  setWindowFocused: (focused: boolean) => void;
  startWorking: (command: string, durationMs?: number) => void;
}

let activityTimer: ReturnType<typeof setTimeout> | null = null;

export const usePetStore = create<PetState>((set, get) => ({
  mode: 'idle',
  currentCommand: null,
  windowFocused: true,

  setWindowFocused: (focused) => {
    set((state) => ({
      windowFocused: focused,
      mode: focused ? (state.currentCommand ? 'working' : 'idle') : 'sleeping'
    }));
  },

  startWorking: (command, durationMs = 2600) => {
    if (activityTimer) {
      clearTimeout(activityTimer);
    }

    set({
      currentCommand: command,
      mode: 'working'
    });

    activityTimer = setTimeout(() => {
      const { windowFocused } = get();
      set({
        currentCommand: null,
        mode: windowFocused ? 'idle' : 'sleeping'
      });
      activityTimer = null;
    }, durationMs);
  }
}));

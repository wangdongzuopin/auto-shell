import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../../shared/types';

interface UserState {
  user: User;
  updateUser: (updates: Partial<User>) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: {
        id: 'default-user',
        name: 'jelly',
      },
      updateUser: (updates) => set((state) => ({
        user: { ...state.user, ...updates },
      })),
    }),
    {
      name: 'user-storage',
    }
  )
);

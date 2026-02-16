import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';

interface User {
  phoneNumber: string;
  telegramChatId?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) =>
        set({
          isAuthenticated: true,
          user,
          token,
        }),
      clearAuth: () =>
        set({
          isAuthenticated: false,
          user: null,
          token: null,
        }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'epass-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    } as PersistOptions<AuthState>
  )
);

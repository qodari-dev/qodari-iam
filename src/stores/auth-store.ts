// src/stores/auth-store.ts
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand';
import type { MeResponse } from '@/schemas/auth';

export type AuthState = {
  auth: MeResponse | null;
  setAuth: (auth: MeResponse | null) => void;
  clearAuth: () => void;
  hasPermission: (perm: string) => boolean;
  hasAnyPermission: (perms: string[]) => boolean;
};

export type AuthStore = StoreApi<AuthState>;

/**
 * Crea una instancia del store de auth.
 * Puedes pasar auth inicial (MeResponse) o null.
 */
export function createAuthStore(initialAuth: MeResponse | null = null): AuthStore {
  return createStore<AuthState>()((set, get) => ({
    auth: initialAuth,

    setAuth: (auth) => set({ auth }),

    clearAuth: () => set({ auth: null }),

    hasPermission: (perm) => {
      const auth = get().auth;
      if (!auth) return false;
      if (auth.user.isAdmin) return true;
      return !!auth.permissions?.includes(perm);
    },

    hasAnyPermission: (perms) => {
      const auth = get().auth;
      if (!auth) return false;
      if (auth.user.isAdmin) return true;
      return perms.some((p) => auth.permissions?.includes(p));
    },
  }));
}

"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";

import type { AuthState, AuthStore } from "./auth-store";
import { createAuthStore } from "./auth-store";
import type { MeResponse } from "@/schemas/auth";

const AuthStoreContext = createContext<AuthStore | null>(null);

type AuthStoreProviderProps = {
  children: ReactNode;
  initialAuth: MeResponse | null;
};

export function AuthStoreProvider({
  children,
  initialAuth,
}: AuthStoreProviderProps) {
  // Se crea el store solo una vez por montaje (lazy initializer)
  const [store] = useState<AuthStore>(() => createAuthStore(initialAuth));

  return (
    <AuthStoreContext.Provider value={store}>
      {children}
    </AuthStoreContext.Provider>
  );
}

function useAuthStoreBase<T>(selector: (state: AuthState) => T): T {
  const store = useContext(AuthStoreContext);
  if (!store) {
    throw new Error("useAuthStore must be used within <AuthStoreProvider>");
  }
  return useStore(store, selector);
}

/** Hook genérico para seleccionar del store */
export function useAuthStore<T>(selector: (state: AuthState) => T): T {
  return useAuthStoreBase(selector);
}

/** Helpers de conveniencia */
export const useAuth = () => useAuthStore((s) => s.auth);
export const useAuthUser = () => useAuthStore((s) => s.auth?.user ?? null);
export const useAuthAccounts = () =>
  useAuthStore((s) => s.auth?.accounts ?? []);
export const useCurrentAccountId = () =>
  useAuthStore((s) => s.auth?.currentAccountId ?? null);
export const useHasPermission = (perm: string) =>
  useAuthStore((s) => s.hasPermission(perm));
export const useHasAnyPermission = (perms: string[]) =>
  useAuthStore((s) => s.hasAnyPermission(perms));

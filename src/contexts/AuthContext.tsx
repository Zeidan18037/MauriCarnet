"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { registerUser, loginUser, getUsersCount } from "@/lib/crud";
import { synchroniserUtilisateur } from "@/lib/sync";
import type { User } from "@/lib/db";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isFirstUser: boolean;
  login: (username: string, pin: string) => Promise<boolean>;
  register: (username: string, pin: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  isFirstUser: false,
  login: async () => false,
  register: async () => null,
  logout: () => {},
});

const STORAGE_KEY = "mauricarnet_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    (async () => {
      const count = await getUsersCount();
      setIsFirstUser(count === 0);

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (username: string, pin: string): Promise<boolean> => {
      const u = await loginUser(username, pin);
      if (u) {
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        synchroniserUtilisateur(u);
        return true;
      }
      return false;
    },
    []
  );

  const register = useCallback(
    async (username: string, pin: string): Promise<string | null> => {
      try {
        const u = await registerUser(username, pin);
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        synchroniserUtilisateur(u);
        return null;
      } catch (err: any) {
        return err.message ?? "Erreur lors de l'inscription";
      }
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isFirstUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { registerUser, loginUser, getUsersCount, getSessionTimeout } from "@/lib/crud";
import { synchroniserUtilisateur } from "@/lib/sync";
import type { User } from "@/lib/db";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isFirstUser: boolean;
  login: (username: string, pin: string) => Promise<string | null>;
  register: (username: string, pin: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  isFirstUser: false,
  login: async () => "Erreur inconnue",
  register: async () => null,
  logout: () => {},
});

const STORAGE_KEY = "mauricarnet_user";
const SESSION_START_KEY = "mauricarnet_session_start";

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
          const session = JSON.parse(saved);
          const started = localStorage.getItem(SESSION_START_KEY);
          if (started && Date.now() - parseInt(started) > getSessionTimeout()) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(SESSION_START_KEY);
          } else if (session && typeof session.id === "number") {
            setUser(session as User);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_START_KEY);
  }, []);

  useEffect(() => {
    if (!user) return;
    let timeout: ReturnType<typeof setTimeout>;
    function resetTimer() {
      clearTimeout(timeout);
      timeout = setTimeout(logout, getSessionTimeout());
    }
    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user, logout]);

  const login = useCallback(
    async (username: string, pin: string): Promise<string | null> => {
      try {
        const u = await loginUser(username, pin);
        if (u) {
          setUser(u);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
          localStorage.setItem(SESSION_START_KEY, String(Date.now()));
          synchroniserUtilisateur(u);
          return null;
        }
        return "Nom d'utilisateur ou code PIN incorrect";
      } catch (err: any) {
        return err.message ?? "Erreur de connexion";
      }
    },
    []
  );

  const register = useCallback(
    async (username: string, pin: string): Promise<string | null> => {
      try {
        const u = await registerUser(username, pin);
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
        synchroniserUtilisateur(u);
        return null;
      } catch (err: any) {
        return err.message ?? "Erreur lors de l'inscription";
      }
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading, isFirstUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

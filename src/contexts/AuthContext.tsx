"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { registerUser, loginUser, getUsersCount, getSessionTimeout, hashPin } from "@/lib/crud";
import { synchroniserUtilisateur } from "@/lib/sync";
import { pullUserData } from "@/lib/pull";
import { initKey, clearKey } from "@/lib/crypto";
import { getDB, type User } from "@/lib/db";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  isFirstUser: boolean;
  jwt: string | null;
  login: (username: string, pin: string) => Promise<string | null>;
  register: (username: string, pin: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  isFirstUser: false,
  jwt: null,
  login: async () => "Erreur inconnue",
  register: async () => null,
  logout: () => {},
});

const STORAGE_KEY = "mauricarnet_user";
const SESSION_START_KEY = "mauricarnet_session_start";
const JWT_KEY = "mauricarnet_jwt";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    (async () => {
      const count = await getUsersCount();
      setIsFirstUser(count === 0);

      const savedJwt = localStorage.getItem(JWT_KEY);
      if (savedJwt) setJwt(savedJwt);

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
            localStorage.setItem("mauricarnet_username", session.username);
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const logout = useCallback(() => {
    const currentJwt = jwt || localStorage.getItem(JWT_KEY);
    if (currentJwt) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${currentJwt}` },
      }).catch(() => {});
    }
    setUser(null);
    setJwt(null);
    clearKey();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_START_KEY);
    localStorage.removeItem("mauricarnet_username");
    localStorage.removeItem(JWT_KEY);
  }, [jwt]);

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
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, pin }),
        });

        if (res.ok) {
          const data = await res.json();
          const accessToken = data.session?.access_token;
          if (accessToken) {
            setJwt(accessToken);
            localStorage.setItem(JWT_KEY, accessToken);
          }
          if (data.user) {
            const u: User = {
              id: data.user.id,
              username: data.user.username,
              pin_hash: "",
              created_at: new Date(),
            };
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
            localStorage.setItem("mauricarnet_username", u.username);
            localStorage.setItem(SESSION_START_KEY, String(Date.now()));
            const salt = data.user.enc_salt || localStorage.getItem("mauricarnet_enc_salt") || "";
            if (salt) localStorage.setItem("mauricarnet_enc_salt", salt);
            initKey(pin, salt || username);
            pullUserData(data.user.id, accessToken);
            return null;
          }
        }
        const err = await res.json().catch(() => ({ error: "Nom d'utilisateur ou code PIN incorrect" }));
        return err.error || "Nom d'utilisateur ou code PIN incorrect";
      } catch {
        // offline — fallback to local
        try {
          const u = await loginUser(username, pin);
          if (u) {
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
            localStorage.setItem("mauricarnet_username", u.username);
            localStorage.setItem(SESSION_START_KEY, String(Date.now()));
            const salt = localStorage.getItem("mauricarnet_enc_salt") || "";
            initKey(pin, salt || username);
            synchroniserUtilisateur(u.username);
            return null;
          }
          return "Nom d'utilisateur ou code PIN incorrect";
        } catch (err: any) {
          return err.message ?? "Erreur de connexion";
        }
      }
    },
    []
  );

  const register = useCallback(
    async (username: string, pin: string): Promise<string | null> => {
      const pin_hash = await hashPin(pin);

      try {
        const encSalt = crypto.randomUUID();

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, pin, pin_hash, enc_salt: encSalt }),
        });

        if (res.ok) {
          const data = await res.json();

          if (data.session?.access_token) {
            setJwt(data.session.access_token);
            localStorage.setItem(JWT_KEY, data.session.access_token);
          }

          if (data.user) {
            const db = getDB();
            const existing = await db.users.where("username").equals(username).first();
            if (existing) {
              await db.users.update(existing.id!, { pin_hash });
            } else {
              await db.users.add({
                id: data.user.id,
                username: data.user.username,
                pin_hash,
                created_at: new Date(),
              } as User);
            }

            const u: User = {
              id: data.user.id,
              username: data.user.username,
              pin_hash,
              created_at: new Date(),
            };
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
            localStorage.setItem("mauricarnet_username", u.username);
            localStorage.setItem(SESSION_START_KEY, String(Date.now()));
            localStorage.setItem("mauricarnet_enc_salt", encSalt);
            initKey(pin, encSalt);
            return null;
          }
        } else {
          const err = await res.json().catch(() => ({ error: "Erreur lors de l'inscription" }));
          return err.error || "Erreur lors de l'inscription";
        }
      } catch {
        // offline — fallback to local
        try {
          const u = await registerUser(username, pin);
          if (u) {
            localStorage.setItem(`mauricarnet_pin_${username}`, pin);
            const salt = u.enc_salt || crypto.randomUUID();
            localStorage.setItem("mauricarnet_enc_salt", salt);
            setUser(u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: u.id, username: u.username }));
            localStorage.setItem("mauricarnet_username", u.username);
            localStorage.setItem(SESSION_START_KEY, String(Date.now()));
            initKey(pin, salt);
            synchroniserUtilisateur(u.username, pin, u.enc_salt || salt);
            return null;
          }
        } catch (err: any) {
          return err.message ?? "Erreur lors de l'inscription";
        }
      }

      return null;
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, loading, isFirstUser, jwt, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

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
import { synchroniserUtilisateur, synchroniser } from "@/lib/sync";
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

const SESSION_KEY = "mauricarnet_session";
const JWT_KEY = "mauricarnet_jwt";
const REFRESH_TOKEN_KEY = "mauricarnet_refresh_token";
const SESSION_INACTIVITY_MS = 3 * 24 * 60 * 60 * 1000;

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

      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        try {
          const session = JSON.parse(saved);
          if (session.loginTime && Date.now() - session.loginTime > getSessionTimeout()) {
            localStorage.removeItem(SESSION_KEY);
          } else if (session && typeof session.id === "number") {
            setUser({ ...session } as User);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
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
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(JWT_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, [jwt]);

  useEffect(() => {
    if (!user) return;
    let timeout: ReturnType<typeof setTimeout>;
    function resetTimer() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setJwt(null);
        // Ne pas supprimer le JWT/refresh du localStorage pour permettre un refresh silencieux
      }, SESSION_INACTIVITY_MS);
    }
    const events = ["mousedown", "touchstart", "keydown", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timeout);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

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
          const refreshToken = data.session?.refresh_token;
          if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }
          if (data.user) {
            const db = getDB();
            let localUser = await db.users.where("username").equals(data.user.username).first();
            if (!localUser) {
              const newId = await db.users.add({
                username: data.user.username,
                auth_uid: data.user.auth_uid,
                pin_hash: "",
                enc_salt: data.user.enc_salt || null,
                created_at: new Date(),
              } as User);
              localUser = (await db.users.get(newId)) as User;
            }
            if (!localUser || !localUser.id) return "Erreur lors de la récupération de l'utilisateur";
            const localId = localUser.id;
            const u: User = {
              id: localId,
              username: data.user.username,
              pin_hash: "",
              created_at: new Date(),
              auth_uid: data.user.auth_uid,
              enc_salt: data.user.enc_salt || null,
            };
            setUser(u);
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...u, loginTime: Date.now() }));
            const salt = data.user.enc_salt || localStorage.getItem("mauricarnet_enc_salt") || "";
            if (salt) localStorage.setItem("mauricarnet_enc_salt", salt);
            initKey(pin, salt || username);
            synchroniser(localId);
            pullUserData(localId);
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
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...u, loginTime: Date.now() }));
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
          const refreshToken = data.session?.refresh_token;
          if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }

          if (data.user) {
            const db = getDB();
            const existing = await db.users.where("username").equals(username).first();
            let localId: number;
            if (existing) {
              await db.users.update(existing.id!, { pin_hash, auth_uid: data.user.auth_uid, enc_salt: data.user.enc_salt });
              localId = existing.id!;
            } else {
              localId = await db.users.add({
                username: data.user.username,
                pin_hash,
                auth_uid: data.user.auth_uid,
                enc_salt: data.user.enc_salt,
                created_at: new Date(),
              } as User);
            }

            const u: User = {
              id: localId,
              username: data.user.username,
              pin_hash,
              created_at: new Date(),
              auth_uid: data.user.auth_uid,
              enc_salt: data.user.enc_salt,
            };
            setUser(u);
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...u, loginTime: Date.now() }));
            localStorage.setItem("mauricarnet_enc_salt", encSalt);
            initKey(pin, encSalt);
            synchroniser(localId);
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
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...u, loginTime: Date.now() }));
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

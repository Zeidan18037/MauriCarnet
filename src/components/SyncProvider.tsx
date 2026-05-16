"use client";

import { useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { synchroniser, syncPendingUsers } from "@/lib/sync";
import { pullUserData } from "@/lib/pull";

const SYNC_INTERVAL = 60000;

interface SyncCtx {
  triggerSync: () => void;
}

const SyncContext = createContext<SyncCtx>({
  triggerSync: () => {},
});

export function useSync() {
  return useContext(SyncContext);
}

export default function SyncProvider({ children }: { children?: ReactNode }) {
  const { user, jwt } = useAuth();

  const triggerSync = useCallback(() => {
    if (!user?.id) return;
    synchroniser(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !jwt) return;
    const uid: number = user.id;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_REQUEST") {
        synchroniser(uid);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);

    const tick = () => {
      syncPendingUsers();
      synchroniser(uid);
      if (jwt) pullUserData(uid, jwt);
    };

    const interval = setInterval(tick, SYNC_INTERVAL);
    tick();

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, [user?.id, jwt]);

  return (
    <SyncContext.Provider value={{ triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

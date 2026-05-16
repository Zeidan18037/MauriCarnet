"use client";

import { useEffect, createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { synchroniser, syncPendingUsers } from "@/lib/sync";
import { pullUserData } from "@/lib/pull";

const SYNC_INTERVAL = 60000;
const IMMEDIATE_SYNC_EVENT = "mauricarnet-immediate-sync";

interface SyncCtx {
  triggerSync: () => void;
  triggerImmediateSync: () => void;
}

const SyncContext = createContext<SyncCtx>({
  triggerSync: () => {},
  triggerImmediateSync: () => {},
});

export function useSync() {
  return useContext(SyncContext);
}

export function dispatchImmediateSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(IMMEDIATE_SYNC_EVENT));
}

export default function SyncProvider({ children }: { children?: ReactNode }) {
  const { user, jwt } = useAuth();

  const userId = user?.id;
  const triggerSync = () => { if (userId) synchroniser(userId); };
  const triggerImmediateSync = () => { if (userId) synchroniser(userId); };

  useEffect(() => {
    if (!user?.id) return;
    const uid: number = user.id;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_REQUEST") {
        synchroniser(uid);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);

    const immediateHandler = () => {
      synchroniser(uid);
    };
    window.addEventListener(IMMEDIATE_SYNC_EVENT, immediateHandler);

    const tick = () => {
      syncPendingUsers();
      synchroniser(uid);
      if (jwt) pullUserData(uid, jwt);
      else pullUserData(uid);
    };

    const interval = setInterval(tick, SYNC_INTERVAL);
    tick();

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
      window.removeEventListener(IMMEDIATE_SYNC_EVENT, immediateHandler);
      clearInterval(interval);
    };
  }, [user?.id, jwt]);

  return (
    <SyncContext.Provider value={{ triggerSync, triggerImmediateSync }}>
      {children}
    </SyncContext.Provider>
  );
}

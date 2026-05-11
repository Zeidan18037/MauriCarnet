"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const token = localStorage.getItem("mauricarnet_api_token") ||
                      localStorage.getItem("API_SYNC_TOKEN") || "";

        if (process.env.NEXT_PUBLIC_API_SYNC_TOKEN) {
          localStorage.setItem("mauricarnet_api_token", process.env.NEXT_PUBLIC_API_SYNC_TOKEN);
          reg.active?.postMessage({ type: "SET_TOKEN", token: process.env.NEXT_PUBLIC_API_SYNC_TOKEN });
        } else if (token) {
          reg.active?.postMessage({ type: "SET_TOKEN", token });
        }

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (worker && token) {
            worker.postMessage({ type: "SET_TOKEN", token });
          }
        });
      })
      .catch((err) => console.error("SW registration failed:", err));
  }, []);

  return null;
}
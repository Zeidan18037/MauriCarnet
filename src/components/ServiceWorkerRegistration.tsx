"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        function sendJwtToSw() {
          const jwt = localStorage.getItem("mauricarnet_jwt");
          if (jwt && reg.active) {
            reg.active.postMessage({ type: "SET_TOKEN", token: jwt });
          }
        }

        sendJwtToSw();

        window.addEventListener("storage", (e) => {
          if (e.key === "mauricarnet_jwt") sendJwtToSw();
        });

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (worker) {
            worker.addEventListener("statechange", () => {
              if (worker.state === "activated") sendJwtToSw();
            });
          }
        });
      })
      .catch((err) => console.error("SW registration failed:", err));
  }, []);

  return null;
}

const CACHE_NAME = "mauricarnet-v2";
const STATIC_ASSETS = ["/", "/offline"];
const FETCH_TIMEOUT = 10000;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      return fetch(event.request, { signal: controller.signal })
        .then((res) => {
          clearTimeout(timeout);
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => cached ?? caches.match("/offline"));
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mauricarnet") {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({ type: "SYNC_START" })
    );

    const token = await new Promise((resolve) => {
      const handleMessage = (event) => {
        if (event.data?.type === "SW_TOKEN") {
          self.removeEventListener("message", handleMessage);
          resolve(event.data.token);
        }
      };
      self.addEventListener("message", handleMessage);
      setTimeout(() => resolve(null), 2000);
    });

    const response = await fetch("/api/sync", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token || ""}` },
    });

    const ok = response.ok;
    clients.forEach((client) =>
      client.postMessage({ type: "SYNC_DONE", ok })
    );
  } catch (err) {
    console.error("Sync échouée", err);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SET_TOKEN") {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) =>
        client.postMessage({ type: "SW_TOKEN", token: event.data.token })
      );
    });
  }
});

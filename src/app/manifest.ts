import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MauriCarnet",
    short_name: "MauriCarnet",
    description: "Gestion des ventes et du carnet de dettes pour les boutiques en Mauritanie",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a7c3b",
    icons: [
      {
        src: "/icon-192x192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon-512x512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}

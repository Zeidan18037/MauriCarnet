import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import SwipeNav from "@/components/SwipeNav";
import AuthGate from "@/components/AuthGate";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/lib/i18n";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MauriCarnet",
  description: "Gestion des ventes et du carnet de dettes pour les boutiques en Mauritanie",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MauriCarnet",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col pb-20">
        <AuthProvider>
          <LocaleProvider>
            <AuthGate>
              {children}
              <ServiceWorkerRegistration />
              <SwipeNav />
              <BottomNav />
            </AuthGate>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

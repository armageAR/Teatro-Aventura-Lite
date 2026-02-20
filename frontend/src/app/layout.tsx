import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell/AppShell";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Teatro Aventura Lite",
    template: "%s | Teatro Aventura Lite",
  },
  applicationName: "Teatro Aventura Lite",
  description:
    "Plataforma interactiva para dirigir obras de teatro ramificadas donde el público vota cómo continúa la historia en tiempo real.",
  keywords: [
    "teatro interactivo",
    "aventuras ramificadas",
    "votación del público",
    "gestión de obras",
    "Teatro Aventura",
  ],
  authors: [{ name: "Teatro Aventura" }],
  category: "entertainment",
  openGraph: {
    title: "Teatro Aventura Lite",
    description:
      "Gestioná funciones interactivas y permití que la audiencia decida el rumbo de la obra.",
    type: "website",
    locale: "es_AR",
    siteName: "Teatro Aventura Lite",
  },
  twitter: {
    card: "summary_large_image",
    title: "Teatro Aventura Lite",
    description:
      "App para administrar obras interactivas donde el público vota cada giro de la trama.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

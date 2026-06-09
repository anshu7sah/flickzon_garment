import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

import type { Viewport } from "next";

export const metadata: Metadata = {
  title: "Flickzon Garment - Business Management",
  description: "Complete garment business management system for orders, workers, clients, and finance",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";
import { AppProvider } from "@/context/LanguageContext";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "SRMSS | Smart Route Management & Scheduling System",
  description: "Digitalizing public transport depot operations in Sri Lanka",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SRMSS",
  },
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300`}>
        <AppProvider>
          <Toaster position="top-right" />
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
        </AppProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: {
    default: "Bitácora Obra Premium | Gestión de Proyectos de Construcción",
    template: "%s | Bitácora Obra Premium",
  },
  description:
    "Sistema profesional de bitácora de obra para gestión de proyectos de construcción.",
  authors: [{ name: "Bitácora Obra Premium" }],
  creator: "Bitácora Obra Premium",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#007AFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="flex min-h-screen bg-white">
            <Sidebar />
            <main className="flex-1 overflow-auto transition-smooth">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

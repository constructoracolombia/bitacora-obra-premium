import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
    "Sistema profesional de bitácora de obra para gestión de proyectos de construcción. Control de avances, pedidos de material, programación Gantt y documentación.",
  keywords: [
    "bitácora de obra",
    "gestión de construcción",
    "proyectos de obra",
    "control de avances",
    "pedidos de material",
    "programación Gantt",
  ],
  authors: [{ name: "Bitácora Obra Premium" }],
  creator: "Bitácora Obra Premium",
  openGraph: {
    type: "website",
    locale: "es_ES",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C0C0C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
        <Providers>
          <div className="flex min-h-screen bg-background">
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

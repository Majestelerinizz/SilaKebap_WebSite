import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Sıla Ops",
  description: "Sıla Kebap — yönetim, mutfak ve kurye paneli",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sıla Ops",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d10",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${plex.variable} ${plexMono.variable} ${plex.className}`}>
        {children}
      </body>
    </html>
  );
}

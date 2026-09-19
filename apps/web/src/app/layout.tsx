import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { JsonLd } from "@/components/JsonLd";
import { SITE } from "@/lib/site";
import "./globals.css";

/** 2 font ailesi — Syne kaldırıldı (LCP / unused CSS için) */
const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const themeInitScript = `(function(){try{var k='silakebap.theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Sıla Kebap | Online Sipariş — Mangaldan Sofrana",
    template: "%s | Sıla Kebap",
  },
  description: SITE.description,
  applicationName: "Sıla Kebap",
  keywords: [
    "sıla kebap",
    "kebap sipariş",
    "online kebap",
    "adana kebap",
    "lahmacun",
    "kurye",
    "gel al",
  ],
  authors: [{ name: "Sıla Kebap" }],
  creator: "Sıla Kebap",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE.url,
    siteName: "Sıla Kebap",
    title: "Sıla Kebap | Online Sipariş",
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: "Sıla Kebap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sıla Kebap | Online Sipariş",
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "Sıla Kebap",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: true,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      data-theme="light"
      className={`${serif.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <JsonLd />
        {children}
      </body>
    </html>
  );
}

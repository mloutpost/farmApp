import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Farm Platform",
  description: "Precision farm mapping and management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Preconnect early to shave the TLS handshake off Google
            Identity Services and the Google APIs the family dashboard
            calls (Calendar, Gmail). Cheap on every page; only matters
            on the dashboard / Gmail wizard. */}
        <link rel="preconnect" href="https://accounts.google.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Eagerly load Google Identity Services as soon as the page is
            interactive, so by the time the family dashboard mounts and
            asks for a token client, `window.google.accounts.oauth2` is
            already present. Without this preload the dashboard's
            "Connect" button sits disabled with "Loading Google sign-in…"
            for ~2-3 seconds after every navigation while React waits
            for the script. `afterInteractive` runs once the document is
            usable so it doesn't block first paint. */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}

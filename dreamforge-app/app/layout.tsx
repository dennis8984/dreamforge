import type { Metadata } from "next";
import { Geist, Geist_Mono, Dancing_Script, Great_Vibes, Poppins } from "next/font/google";
import "./globals.css";
import { Suspense } from 'react';
import AuthHandler from "@/components/AuthHandler";
import CookieConsent from "@/components/CookieConsent";
import EntryModal from "@/components/EntryModal";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-cursive",
  subsets: ["latin"],
});

const script = Great_Vibes({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DreamForge - AI Companions & Art",
  description: "Chat with AI companions, generate stunning art, and create your own characters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} ${script.variable} ${poppins.variable} antialiased`}
      >
        <I18nProvider>
          <EntryModal />
          {children}
          <Suspense fallback={null}>
            <AuthHandler />
          </Suspense>
          <CookieConsent />
        </I18nProvider>
      </body>
    </html>
  );
}

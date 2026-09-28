import type { Metadata } from "next";
import {
  Plus_Jakarta_Sans,
  Outfit,
  JetBrains_Mono,
  Inter,
  Fraunces,
  Space_Mono,
} from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DesignKaro - Interactive System Design & Architecture Simulator",
  description:
    "Interactive System Design learning, architecture practice, simulation, and interview platform. Don't memorize architectures. Learn how to think about architectures.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${plusJakartaSans.variable} ${outfit.variable} ${jetbrainsMono.variable} ${inter.variable} ${fraunces.variable} ${spaceMono.variable} min-h-screen bg-surface-ground text-zinc-200 antialiased selection:bg-blue-600/30 selection:text-blue-200 font-sans`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:font-semibold focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white font-mono text-xs transition"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@200;300;400;500;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#050914] text-slate-200 antialiased selection:bg-sky-500/30 selection:text-sky-200 font-sans">
        {children}
      </body>
    </html>
  );
}

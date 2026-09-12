import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignKaro | Socho. Design Karo. Scale Karo.",
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
      <body className="min-h-screen flex flex-col bg-surface-950 text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}

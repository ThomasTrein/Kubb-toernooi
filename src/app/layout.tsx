import type { Metadata } from "next";
import Link from "next/link";
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
  title: "Kubb Toernooi",
  description: "Kubb toernooi bij de zomerbar \u2014 poules, schema en standen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="bg-[var(--color-sun)] border-b-4 border-[var(--color-sun-dark)] shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-xl text-[var(--color-wood)]">
              <span aria-hidden>🪵</span>
              <span>Kubb Toernooi</span>
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium text-[var(--color-wood)] hover:underline"
            >
              Beheer
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-[var(--foreground)]/60 py-6">
          🌞 Kubb Toernooi &mdash; gemaakt voor de zomerbar
        </footer>
      </body>
    </html>
  );
}


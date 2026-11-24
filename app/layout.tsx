import type { Metadata } from "next";
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
  title: "VetoAI — Contract X-Ray & Legal Trap Detection",
  description:
    "Educational document-risk reviewer with native PDF/DOCX/TXT file scanning. Detect training bonds, rental traps, and unfair clauses with instant negotiation scripts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 selection:bg-cyan-400 selection:text-slate-950 antialiased">
        {children}
      </body>
    </html>
  );
}

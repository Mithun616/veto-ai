import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VetoAI — Document Risk Review & Pushback Drafts",
  description:
    "Review offers, leases, and terms for concerning clauses and missing protections—then draft a respectful response.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-[#07090D] text-[#F5F7FA] selection:bg-[#D2F54B] selection:text-[#07090D] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

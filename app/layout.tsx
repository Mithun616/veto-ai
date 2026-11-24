import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VetoAI — Spot Every Trap Before You Sign",
  description:
    "Ultra-minimal, plain-English contract risk scanner. Scan PDF, DOCX, or text to detect training bonds, rental traps, and missing safeguards with instant counter-proposals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-[#05070C] text-[#F8FAFC] selection:bg-[#D4FF2A] selection:text-[#05070C] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

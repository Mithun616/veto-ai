"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  historyCount: number;
  onSignIn: () => void;
  onSignOut: () => void;
  onToggleHistory: () => void;
}

export function Header({
  user,
  historyCount,
  onSignIn,
  onSignOut,
  onToggleHistory,
}: HeaderProps) {
  const firstName = user?.displayName?.split(" ")[0] || "Account";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07090D]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white font-semibold tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded-lg p-1"
            aria-label="VetoAI home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#161B23] border border-white/10 flex items-center justify-center text-[#D2F54B] shadow-inner">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-[#F5F7FA]">
              Veto<span className="text-[#6CA8FF]">AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation & Auth Strip */}
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="#how-it-works"
            className="text-xs sm:text-sm text-[#ABB5C5] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded-md px-2.5 py-1.5 hidden md:inline"
          >
            How it works
          </a>

          <div
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#161B23] text-[#ABB5C5] border border-white/10"
            role="note"
            aria-label="Educational disclaimer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#6CA8FF]" aria-hidden="true" />
            <span>Educational review</span>
          </div>

          {/* User Auth & History Actions */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* History Toggle Button */}
              <button
                type="button"
                onClick={onToggleHistory}
                aria-label={`Open scan history (${historyCount} saved)`}
                className="px-2.5 py-1.5 rounded-xl bg-[#161B23] hover:bg-[#1f2633] text-xs font-medium text-[#F5F7FA] border border-white/10 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] min-h-[36px]"
              >
                <svg
                  className="w-3.5 h-3.5 text-[#6CA8FF]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>History</span>
                <span className="px-1.5 py-0.2 rounded-full bg-[#6CA8FF]/15 text-[#6CA8FF] font-mono text-[10px]">
                  {historyCount}
                </span>
              </button>

              {/* User Avatar & Name */}
              <div className="flex items-center gap-2 pl-1 border-l border-white/10">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User avatar"}
                    width={28}
                    height={28}
                    unoptimized
                    className="w-7 h-7 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-semibold">
                    {firstName.charAt(0)}
                  </div>
                )}
                <span className="text-xs font-medium text-[#F5F7FA] hidden lg:inline max-w-[100px] truncate">
                  {firstName}
                </span>

                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="text-xs text-[#738094] hover:text-white px-1.5 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF]"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              aria-label="Sign in with Google"
              className="px-3 py-1.5 rounded-xl bg-[#161B23] hover:bg-[#1f2633] text-xs font-medium text-[#F5F7FA] border border-white/10 hover:border-white/20 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] min-h-[36px]"
            >
              {/* Google G SVG */}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.43 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.57 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

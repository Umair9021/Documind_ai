"use client";
import Link from "next/link";
import { Sparkles, BookOpen, Layers, Settings, User } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white font-bold text-sm shadow-sm">
            D
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900">
            DocuMind <span className="text-sky-600 font-bold">AI</span>
          </span>
        </Link>

        <nav className="flex items-center space-x-1 sm:space-x-4">
          <Link
            href="/dashboard"
            className="flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Layers className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link
            href="/knowledge-bases"
            className="flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <BookOpen className="h-4 w-4 text-slate-500" />
            <span>Knowledge Bases</span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center space-x-2 pl-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              U
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "../lib/theme";
import { Icon } from "./Icons";
import { ThemeToggle, cx, useToast, ToastProvider } from "./ui";

const workspaceNav = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Knowledge Bases", href: "/knowledge-bases", icon: "library" },
];

function Logo({ compact = false }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <Icon name="logo" className="size-7 transition-transform group-hover:scale-105" />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          DocuMind AI
        </span>
      )}
    </Link>
  );
}

function NavList({ onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();

  const go = (href) => {
    router.push(href);
    if (onNavigate) onNavigate();
  };

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/knowledge-bases") {
      return pathname === "/knowledge-bases" || pathname.startsWith("/knowledge-bases/");
    }
    return pathname === href;
  };

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {/* Workspace links */}
      <div className="space-y-1">
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
          Workspace
        </p>
        {workspaceNav.map((item) => {
          const active = isActive(item.href);
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className={cx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon name={item.icon} className="size-[18px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat History Rail */}
      <SidebarHistory onNavigate={onNavigate} />
    </nav>
  );
}

function SidebarHistory({ onNavigate }) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    // Load conversations from localStorage
    try {
      const saved = localStorage.getItem("documind-conversations");
      if (saved) {
        setConversations(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, [pathname]);

  const deleteChat = (e, id) => {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    localStorage.setItem("documind-conversations", JSON.stringify(updated));
    toast("Conversation deleted");
  };

  return (
    <div className="min-w-0 space-y-1">
      <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Chat history
      </p>
      {conversations.length === 0 ? (
        <p className="px-3 py-2 text-[13px] leading-relaxed text-faint">
          Your conversations will appear here once you start a chat.
        </p>
      ) : (
        <div className="space-y-0.5">
          {conversations.map((c) => {
            const active = pathname.includes(c.id);
            return (
              <div
                key={c.id}
                onClick={() => {
                  router.push(`/knowledge-bases/${c.kbId}/chat?c=${c.id}`);
                  if (onNavigate) onNavigate();
                }}
                className={cx(
                  "group flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface hover:text-foreground"
                )}
              >
                <Icon name="chat" className="size-[18px] shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {c.title}
                  </span>
                  <span className="block truncate text-[11px] text-faint">
                    {c.kbName || "Knowledge Base"}
                  </span>
                </span>
                <button
                  onClick={(e) => deleteChat(e, c.id)}
                  aria-label="Delete chat"
                  className="shrink-0 rounded-md p-1 text-faint opacity-0 transition-opacity hover:bg-surface hover:text-red-500 group-hover:opacity-100"
                >
                  <Icon name="trash" className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserBlock({ onNavigate }) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  return (
    <div className="border-t border-border p-3">
      <ThemeToggle theme={theme} toggle={toggle} variant="full" />
      <button
        onClick={() => {
          router.push("/settings");
          if (onNavigate) onNavigate();
        }}
        className="mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
      >
        <Icon name="settings" className="size-[18px]" />
        <span>Settings</span>
      </button>

      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white shadow-sm">
          AR
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">Aditi Rao</p>
          <p className="truncate text-xs text-muted">aditi@research.edu</p>
        </div>
        <button
          onClick={() => router.push("/")}
          className="rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground"
          aria-label="Log out"
        >
          <Icon name="logout" className="size-[18px]" />
        </button>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  const [drawer, setDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-panel lg:flex">
          <div className="flex h-16 items-center px-5">
            <Logo />
          </div>
          <div className="px-3">
            <button
              onClick={() => router.push("/knowledge-bases")}
              className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface/60 px-3 py-2 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Icon name="search" className="size-4" />
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border border-border-strong px-1.5 font-mono text-[11px] text-faint">
                ⌘K
              </kbd>
            </button>
          </div>
          <NavList />
          <UserBlock />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-foreground/30 backdrop-blur-xs transition-opacity"
              onClick={() => setDrawer(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r border-border bg-panel shadow-2xl">
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button
                  onClick={() => setDrawer(false)}
                  className="rounded-lg p-1.5 text-faint hover:bg-surface"
                >
                  <Icon name="close" className="size-4" />
                </button>
              </div>
              <NavList onNavigate={() => setDrawer(false)} />
              <UserBlock onNavigate={() => setDrawer(false)} />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Mobile TopBar */}
          <header className="flex h-16 items-center justify-between border-b border-border bg-panel px-4 lg:hidden">
            <button
              onClick={() => setDrawer(true)}
              className="rounded-lg p-2 text-foreground hover:bg-surface"
              aria-label="Open menu"
            >
              <Icon name="menu" className="size-5" />
            </button>
            <Logo />
            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} toggle={toggle} />
              <div className="flex size-8 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white">
                AR
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>

        {/* Floating Help Button */}
        <div className="fixed bottom-5 right-5 z-30">
          <button
            onClick={() => router.push("/")}
            aria-label="Help"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-panel text-muted shadow-lg hover:border-border-strong hover:text-foreground transition-transform active:scale-95"
          >
            <Icon name="help" className="size-4" />
          </button>
        </div>
      </div>
    </ToastProvider>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

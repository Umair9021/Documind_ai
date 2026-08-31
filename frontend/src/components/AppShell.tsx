import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "../lib/router";
import { useTheme } from "../lib/theme";
import { Icon, ThemeToggle, cx, useToast } from "./ui";
import { knowledgeBases } from "../lib/data";
import { useConversationStore, deleteConversation, restoreConversation, timeAgo } from "../lib/chat";
import { API_BASE } from "../lib/supabase";

const workspace = [
  { label: "Dashboard", to: "/dashboard", icon: "dashboard" as const },
  { label: "Knowledge Bases", to: "/knowledge-bases", icon: "library" as const },
];

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon name="logo" className="size-7" />
      {!compact && <span className="text-[15px] font-semibold tracking-tight">DocuMind AI</span>}
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { path, navigate } = useRouter();
  const go = (to: string) => { navigate(to); onNavigate?.(); };
  const isActive = (to: string) => path === to || (to === "/knowledge-bases" && path.startsWith("/knowledge-bases"));

  const Item = ({ label, to, icon }: { label: string; to: string; icon: Parameters<typeof Icon>[0]["name"] }) => (
    <button
      onClick={() => go(to)}
      className={cx(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive(to) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-foreground",
      )}
    >
      <Icon name={icon} className="size-[18px]" />
      {label}
    </button>
  );

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="space-y-0.5">
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Workspace</p>
        {workspace.map((i) => <Item key={i.to} {...i} />)}
      </div>
      <SidebarHistory onNavigate={onNavigate} />
    </nav>
  );
}

function SidebarHistory({ onNavigate }: { onNavigate?: () => void }) {
  const { query, navigate } = useRouter();
  const all = useConversationStore();
  const toast = useToast();
  const activeId = query.get("c");
  const list = all.filter((c) => c.messages.length > 0).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 25);

  const go = (kbId: string, id: string) => { navigate(`/knowledge-bases/${kbId}/chat?c=${id}`); onNavigate?.(); };
  const del = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const conv = all.find((c) => c.id === id);
    deleteConversation(id);
    if (conv) toast("Conversation deleted", "default", { label: "Undo", onClick: () => restoreConversation(conv) });
  };

  return (
    <div className="min-w-0 space-y-0.5">
      <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">Chat history</p>
      {list.length === 0 ? (
        <p className="px-3 py-2 text-[13px] leading-relaxed text-faint">Your conversations will appear here once you start a chat.</p>
      ) : (
        list.map((c) => {
          const kb = knowledgeBases.find((k) => k.id === c.kbId);
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => go(c.kbId, c.id)}
              className={cx(
                "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors",
                active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-foreground",
              )}
            >
              <Icon name="chat" className="size-[18px] shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{c.title}</span>
                <span className="block truncate text-[11px] text-faint">{kb ? `${kb.name} · ` : ""}{timeAgo(c.updatedAt)}</span>
              </span>
              <span onClick={(e) => del(e, c.id)} role="button" tabIndex={-1} aria-label="Delete conversation" className="shrink-0 rounded-md p-1 text-faint opacity-0 transition-opacity hover:bg-surface hover:text-failed group-hover:opacity-100"><Icon name="trash" className="size-3.5" /></span>
            </button>
          );
        })
      )}
    </div>
  );
}

function UserBlock({ onNavigate }: { onNavigate?: () => void }) {
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<{ full_name: string; email: string }>(() => {
    const saved = localStorage.getItem("dm-user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        return { full_name: u.full_name || "Scholar", email: u.email || "user@documind.ai" };
      } catch {}
    }
    return { full_name: "Muhammad Umair", email: "umair@documind.ai" };
  });

  useEffect(() => {
    const token = localStorage.getItem("dm-token");
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("dm-token");
          localStorage.removeItem("dm-user");
          navigate("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.full_name) {
          setProfile({ full_name: data.full_name, email: data.email });
        }
      })
      .catch(() => {});
  }, []);

  const initials = profile.full_name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MU";

  const logout = () => {
    localStorage.removeItem("dm-token");
    localStorage.removeItem("dm-user");
    navigate("/login");
  };

  return (
    <div className="border-t border-border p-3">
      <ThemeToggle theme={theme} toggle={toggle} variant="full" />
      <button onClick={() => { navigate("/settings"); onNavigate?.(); }} className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground cursor-pointer">
        <Icon name="settings" className="size-[18px]" /> Settings
      </button>
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-semibold text-white">{initials}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{profile.full_name}</p>
          <p className="truncate text-xs text-muted">{profile.email}</p>
        </div>
        <button onClick={logout} className="rounded-md p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground cursor-pointer" title="Log out" aria-label="Log out"><Icon name="logout" className="size-[18px]" /></button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { navigate } = useRouter();
  const [drawer, setDrawer] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem("dm-token");
    if (!token) {
      navigate("/login");
    }
  }, []);
  const openPalette = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  return (
    <div className="flex h-full">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-panel lg:flex">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        <div className="px-3">
          <button onClick={openPalette} className="flex w-full items-center gap-2.5 rounded-lg border border-border-strong bg-surface/60 px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
            <Icon name="search" className="size-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="rounded border border-border-strong px-1.5 font-mono text-[11px]">⌘K</kbd>
          </button>
        </div>
        <NavList />
        <UserBlock />
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="dm-fade absolute inset-0 bg-foreground/30" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-panel" style={{ animation: "dm-drawer-in .22s ease" }}>
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button onClick={() => setDrawer(false)} className="rounded-lg p-1.5 text-faint hover:bg-surface"><Icon name="close" /></button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
            <UserBlock onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-panel px-4 lg:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-foreground hover:bg-surface active:bg-surface/80" aria-label="Open menu"><Icon name="menu" className="size-5" /></button>
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openPalette} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground" aria-label="Search"><Icon name="search" className="size-4" /></button>
            <ThemeToggle theme={theme} toggle={toggle} />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

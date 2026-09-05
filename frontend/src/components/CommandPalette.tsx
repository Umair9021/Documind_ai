import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "../lib/router";
import { useTheme } from "../lib/theme";
import { Icon, cx } from "./ui";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api/v1";

type Command = { id: string; label: string; hint?: string; icon: Parameters<typeof Icon>[0]["name"]; group: string; run: () => void };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [liveKbs, setLiveKbs] = useState<Array<{ id: string; name: string; source_count?: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigate } = useRouter();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);

      const token = localStorage.getItem("dm-token") || "";
      if (token) {
        fetch(`${API_BASE}/knowledge-bases/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => {
            if (Array.isArray(data)) setLiveKbs(data);
          })
          .catch(() => {});
      }
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => { navigate(to); setOpen(false); };
    const nav: Command[] = [
      { id: "dash", label: "Dashboard", icon: "dashboard", group: "Navigate", run: go("/dashboard") },
      { id: "kbs", label: "Knowledge Bases", icon: "library", group: "Navigate", run: go("/knowledge-bases") },
      { id: "play", label: "RAG Playground", icon: "flask", group: "Navigate", run: go("/advanced/playground") },
      { id: "insp", label: "Retrieval Inspector", icon: "inspect", group: "Navigate", run: go("/advanced/inspector") },
      { id: "eval", label: "Evaluation", icon: "chart", group: "Navigate", run: go("/advanced/evaluation") },
      { id: "set", label: "Settings", icon: "settings", group: "Navigate", run: go("/settings") },
    ];
    const kbs: Command[] = liveKbs.map((kb) => ({
      id: kb.id, label: kb.name, hint: `${kb.source_count || 0} sources`, icon: "library", group: "Knowledge bases",
      run: () => { navigate(`/knowledge-bases/${kb.id}/chat`); setOpen(false); },
    }));
    const actions: Command[] = [
      { id: "theme", label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`, icon: theme === "dark" ? "sun" : "moon", group: "Actions", run: () => { toggle(); setOpen(false); } },
      { id: "logout", label: "Log out", icon: "logout", group: "Actions", run: go("/") },
    ];
    return [...nav, ...kbs, ...actions];
  }, [navigate, theme, toggle, liveKbs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Command[]>>((acc, c) => { (acc[c.group] ??= []).push(c); return acc; }, {});
  let flatIndex = -1;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.run(); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="dm-fade absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="dm-fade-up relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl shadow-foreground/15">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Icon name="search" className="size-5 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, knowledge bases, actions…"
            className="h-14 flex-1 bg-transparent text-[15px] placeholder:text-faint focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-border-strong px-1.5 py-0.5 font-mono text-[11px] text-muted sm:block">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted">No results for “{query}”</div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{group}</p>
                {items.map((c) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={c.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={c.run}
                      className={cx("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors", active === idx ? "bg-accent-soft text-accent" : "text-foreground hover:bg-surface")}
                    >
                      <Icon name={c.icon} className={cx("size-[18px]", active === idx ? "text-accent" : "text-muted")} />
                      <span className="flex-1">{c.label}</span>
                      {c.hint && <span className="font-mono text-xs text-faint">{c.hint}</span>}
                      {active === idx && <Icon name="corner-return" className="size-4 text-accent" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

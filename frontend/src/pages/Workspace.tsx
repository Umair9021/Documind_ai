import { useEffect, useRef, useState } from "react";
import { useRouter } from "../lib/router";
import { Button, Breadcrumbs, ConfirmDialog, EmptyState, Icon, SearchInput, StatusBadge, SourceGlyph, Menu, Tabs, Badge, Skeleton, cx, useToast } from "../components/ui";
import { AddSourceModal, RenameKBModal } from "../components/modals";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import { knowledgeBases, sampleConversation } from "../lib/data";
import type { Citation, ChatMessage, KnowledgeBase, Source } from "../lib/data";
import { getConversation, createConversation, updateConversation, titleFrom } from "../lib/chat";
import { API_BASE, getCurrentUser } from "../lib/supabase";

function useKB(id: string) {
  const [kb, setKb] = useState<KnowledgeBase | undefined>(() => {
    try {
      const raw = localStorage.getItem("dm_kbs_cache");
      if (raw) {
        const list: KnowledgeBase[] = JSON.parse(raw);
        const found = list.find((k) => k.id === id);
        if (found) return found;
      }
    } catch {}
    return knowledgeBases.find((k) => k.id === id);
  });

  const reloadKB = () => {
    try {
      const raw = localStorage.getItem("dm_kbs_cache");
      if (raw) {
        const list: KnowledgeBase[] = JSON.parse(raw);
        const found = list.find((k) => k.id === id);
        if (found) {
          setKb({ ...found, sources: [...(found.sources || [])] });
          return;
        }
      }
    } catch {}
  };

  useEffect(() => {
    reloadKB();
    const token = localStorage.getItem("dm-token") || "";
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${API_BASE}/knowledge-bases/${id}`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.id) {
          fetch(`${API_BASE}/sources/kb/${id}`, { headers })
            .then((sRes) => (sRes.ok ? sRes.json() : null))
            .then((sources) => {
              if (Array.isArray(sources) && sources.length > 0) {
                const formattedSources: Source[] = sources.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  type: s.source_type || "pdf",
                  status: s.status || "ready",
                  added: "recently",
                  meta: `${(s.source_type || "doc").toUpperCase()}${s.file_size_bytes ? ` · ${(s.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : ""}`,
                }));
                setKb({
                  id: data.id,
                  name: data.name,
                  description: data.description || "",
                  sources: formattedSources,
                  updated: "Recently active",
                });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [id]);

  const updateKBName = (name: string, desc: string) => {
    setKb((prev) => (prev ? { ...prev, name, description: desc } : prev));
  };

  return { kb, updateKBName, reloadKB };
}

function WorkspaceHeader({
  kb,
  tab,
  sourceName,
  onRenamed,
  onSourcesChanged,
}: {
  kb: KnowledgeBase;
  tab: "chat" | "sources";
  sourceName?: string;
  onRenamed?: (name: string, desc: string) => void;
  onSourcesChanged?: () => void;
}) {
  const { navigate } = useRouter();
  const [add, setAdd] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const toast = useToast();

  const handleRename = async (id: string, name: string, desc: string) => {
    const token = localStorage.getItem("dm-token") || "";
    try {
      await fetch(`${API_BASE}/knowledge-bases/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description: desc }),
      });
      toast(`Knowledge base updated to "${name}"`);
      onRenamed?.(name, desc);
    } catch (e) {}
  };

  const crumbs = [
    { label: "Knowledge bases", to: "/knowledge-bases" },
    { label: kb.name, to: `/knowledge-bases/${kb.id}` },
    ...(sourceName
      ? [{ label: "Sources", to: `/knowledge-bases/${kb.id}/sources` }, { label: sourceName }]
      : []),
  ];
  const sourcesCount = kb.sources ? kb.sources.length : 0;
  return (
    <div className="border-b border-border bg-panel">
      <div className="w-full px-4 pt-3 sm:px-8 sm:pt-5">
        <div className="mb-2.5 hidden sm:block"><Breadcrumbs items={crumbs} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <div>
              <h1 className="truncate text-base sm:text-xl font-semibold tracking-tight">{kb.name}</h1>
              <p className="mt-0.5 font-mono text-[11px] sm:text-xs text-muted">{sourcesCount} sources · updated {kb.updated}</p>
            </div>
            <button
              onClick={() => setRenameModal(true)}
              title="Rename knowledge base"
              className="rounded-lg p-1.5 text-faint hover:bg-surface hover:text-foreground transition-colors"
            >
              <Icon name="doc" className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {tab === "chat" && <Button size="sm" variant="secondary" icon="plus" onClick={() => navigate(`/knowledge-bases/${kb.id}/chat`)}>New chat</Button>}
            {tab === "sources" && <Button size="sm" icon="plus" onClick={() => setAdd(true)}>Add source</Button>}
          </div>
        </div>
        <div className="mt-2.5 sm:mt-4">
          <Tabs
            tabs={[{ id: "chat", label: "Chat", icon: "chat" }, { id: "sources", label: "Sources", icon: "sources", count: sourcesCount }]}
            active={tab}
            onChange={(id) => navigate(`/knowledge-bases/${kb.id}/${id}`)}
          />
        </div>
      </div>
      <AddSourceModal
        open={add}
        onClose={() => setAdd(false)}
        kbId={kb.id}
        onAdded={() => {
          onSourcesChanged?.();
        }}
      />
      <RenameKBModal
        open={renameModal}
        onClose={() => setRenameModal(false)}
        kb={kb}
        onRename={(id, name, desc) => handleRename(id, name, desc)}
      />
    </div>
  );
}

/* ---------------- Chat ---------------- */
function CitationCard({ c, kb }: { c: Citation; kb: KnowledgeBase }) {
  const { navigate } = useRouter();
  const toast = useToast();
  const match = kb.sources.find((s) => s.name === c.source);
  const open = () => {
    if (!match) { toast("Source is no longer in this knowledge base", "error"); return; }
    navigate(`/knowledge-bases/${kb.id}/sources/${match.id}?loc=${encodeURIComponent(c.locator)}`);
  };
  return (
    <button onClick={open} className="group flex h-full w-full flex-col rounded-xl border border-border bg-surface/60 p-2.5 text-left transition-colors hover:border-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:p-3">
      <div className="flex items-center gap-2">
        <SourceGlyph type={c.type} className="size-6 sm:size-7" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{c.source}</p>
          <p className="truncate font-mono text-[11px] text-accent">{c.locator}</p>
        </div>
        <Icon name="arrow-right" className="size-4 shrink-0 text-faint transition-colors group-hover:text-accent" />
      </div>
    </button>
  );
}

function MessageActions({ content, onRegenerate }: { content: string; onRegenerate: () => void }) {
  const toast = useToast();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // Clipboard API is often blocked inside sandboxed/preview iframes — fall back to execCommand.
      const ta = document.createElement("textarea");
      ta.value = content;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* no-op */ }
      document.body.removeChild(ta);
    }
    toast("Answer copied to clipboard");
  };
  const btn = "flex items-center justify-center rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground";
  return (
    <div className="mt-3 flex items-center gap-1">
      <button onClick={copy} className={btn} aria-label="Copy answer"><Icon name="copy" className="size-4" /></button>
      <button onClick={onRegenerate} className={btn} aria-label="Regenerate answer"><Icon name="retry" className="size-4" /></button>
      <span className="mx-1 h-4 w-px bg-border" />
      <button onClick={() => { setVote("up"); toast("Thanks for the feedback"); }} className={cx(btn, vote === "up" && "bg-ready-soft text-ready hover:bg-ready-soft hover:text-ready")} aria-label="Good answer"><Icon name="thumb-up" className="size-4" /></button>
      <button onClick={() => { setVote("down"); toast("Thanks for the feedback"); }} className={cx(btn, vote === "down" && "bg-failed-soft text-failed hover:bg-failed-soft hover:text-failed")} aria-label="Bad answer"><Icon name="thumb-down" className="size-4" /></button>
    </div>
  );
}

function Bubble({ m, kb, onRegenerate }: { m: ChatMessage; kb: KnowledgeBase; onRegenerate: () => void }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end dm-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-white sm:max-w-[75%]">{m.content}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 dm-fade-up">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"><Icon name="sparkle" className="size-4" /></div>
      <div className="min-w-0 flex-1">
        {m.state === "no-info" ? (
          <div className="rounded-xl border border-processing/20 bg-processing-soft px-4 py-3 text-sm text-processing">
            I couldn't find enough information in your sources to answer this question. Try rephrasing, or add more relevant sources.
          </div>
        ) : m.state === "error" ? (
          <div className="rounded-xl border border-failed/20 bg-failed-soft px-4 py-3 text-sm text-failed">
            <p>Something went wrong generating this answer.</p>
            <Button size="sm" variant="secondary" icon="retry" className="mt-2.5" onClick={onRegenerate}>Try again</Button>
          </div>
        ) : (
          <>
            <div className="text-[14.5px] leading-relaxed text-foreground" aria-live={m.streaming ? "polite" : undefined} aria-busy={m.streaming || undefined}>
              <MarkdownRenderer content={m.content} />
              {m.streaming && <span className="ml-1 inline-block h-4 w-1.5 -translate-y-0.5 animate-pulse bg-accent align-middle" aria-hidden />}
            </div>
            {!m.streaming && m.citations && (
              <div className="mt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-faint"><Icon name="quote" className="size-3.5" />Sources</p>
                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                  {m.citations.map((c, i) => (
                    <div key={i} className="w-56 shrink-0 snap-start sm:w-64"><div className="h-full"><CitationCard c={c} kb={kb} /></div></div>
                  ))}
                </div>
              </div>
            )}
            {!m.streaming && <MessageActions content={m.content} onRegenerate={onRegenerate} />}
          </>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"><Icon name="sparkle" className="size-4" /></div>
      <div className="flex items-center gap-1.5 rounded-xl bg-surface px-4 py-3">
        {[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-muted" style={{ animation: `dm-blink 1.2s ${i * 0.16}s infinite` }} />)}
        <span className="ml-1.5 text-[13px] text-muted">Retrieving from your sources…</span>
      </div>
    </div>
  );
}

function ChatView({ kb }: { kb: KnowledgeBase }) {
  const { navigate, query } = useRouter();
  const activeId = query.get("c");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const convId = useRef<string | null>(null);

  // Load the URL-selected conversation when it changes (and isn't the one we're already showing).
  useEffect(() => {
    if (activeId === convId.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setThinking(false);
    setStreaming(false);
    convId.current = activeId;
    setMessages(activeId ? (getConversation(activeId)?.messages ?? []) : []);
  }, [activeId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const busy = thinking || streaming;
  // Persist outside the render/updater phase so store subscribers (HistoryRail) aren't updated mid-render.
  const save = (msgs: ChatMessage[]) => {
    const id = convId.current;
    if (id) queueMicrotask(() => updateConversation(id, { messages: msgs }));
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    // ensure a conversation exists to persist into
    if (!convId.current) {
      const conv = createConversation(kb.id, titleFrom(q));
      convId.current = conv.id;
      navigate(`/knowledge-bases/${kb.id}/chat?c=${conv.id}`);
    } else if (messages.length === 0) {
      updateConversation(convId.current, { title: titleFrom(q) });
    }
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content: q };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    save(updatedMessages);
    setThinking(true);

    let answerText = "";
    let citations: Citation[] = [];

    const token = localStorage.getItem("dm-token") || "";
    try {
      const res = await fetch(`${API_BASE}/chat/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kb_id: kb.id,
          query: q,
          retrieval_strategy: "hybrid_rrf",
          top_k: 6,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        const data = await res.json();
        answerText = data.answer || "";
        citations = (data.citations || []).map((c: any) => ({
          source: c.source_name,
          type: c.source_type || "doc",
          locator: c.page_number
            ? `Page ${c.page_number}`
            : c.timestamp
            ? c.timestamp
            : c.section_name || "Citation",
          snippet: c.content,
        }));
      } else if (!res.ok) {
        const errData = await res.json().catch(() => null);
        answerText = errData?.detail || `Backend error: HTTP ${res.status}`;
      }
    } catch (err: any) {
      console.warn("Backend connection notice:", err);
      answerText = "Backend is not responding. Please make sure your FastAPI backend server is running and accessible at `" + API_BASE + "`.";
    }

    const id = `a${Date.now()}`;
    setThinking(false);
    setStreaming(true);
    const words = answerText.split(" ");
    setMessages((m) => [...m, { id, role: "assistant", content: "", streaming: true, state: "ok" }]);

    words.forEach((w: string, i: number) => {
      const t = setTimeout(() => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id ? { ...msg, content: (msg.content ? msg.content + " " : "") + w } : msg
          )
        );
        if (i === words.length - 1) {
          const done = setTimeout(() => {
            setMessages((m) => {
              const next = m.map((msg) =>
                msg.id === id ? { ...msg, streaming: false, citations } : msg
              );
              save(next);
              return next;
            });
            setStreaming(false);
          }, 100);
          timers.current.push(done);
        }
      }, 50 + i * 12);
      timers.current.push(t);
    });
  };

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setThinking(false);
    setStreaming(false);
    setMessages((m) => { const next = m.map((msg) => msg.streaming ? { ...msg, streaming: false } : msg); save(next); return next; });
  };

  const regenerate = () => {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((m) => {
      const idx = m.map((x) => x.id).lastIndexOf(lastUser.id);
      const next = m.slice(0, idx + 1);
      save(next);
      return next;
    });
    send(lastUser.content);
  };

  const empty = messages.length === 0 && !thinking;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-8 sm:py-6">
          {empty ? (
            <div className="flex flex-col items-center py-10 sm:py-14 text-center">
              <div className="flex size-12 sm:size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon name="sparkle" className="size-6 sm:size-7" /></div>
              <h2 className="mt-4 sm:mt-5 text-lg sm:text-xl font-semibold tracking-tight">Ask anything about your knowledge</h2>
              <p className="mt-1.5 sm:mt-2 max-w-md text-xs sm:text-sm text-muted">Your answers are generated from the sources in this knowledge base, with citations you can verify.</p>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-7">
              {messages.map((m) => <Bubble key={m.id} m={m} kb={kb} onRegenerate={regenerate} />)}
              {thinking && <Thinking />}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-panel px-3 py-3 sm:px-8 sm:py-4">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mx-auto w-full max-w-4xl">
          <div className="flex items-end gap-2 rounded-2xl border border-border-strong bg-surface/50 p-2 focus-within:border-accent focus-within:bg-panel focus-within:ring-2 focus-within:ring-accent/20">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask anything about your knowledge…"
              disabled={busy}
              className="max-h-32 min-h-[26px] flex-1 resize-none bg-transparent px-2 py-1 text-sm placeholder:text-faint focus:outline-none disabled:opacity-60"
            />
            {busy ? (
              <Button type="button" size="sm" variant="secondary" onClick={stop} className="size-9 shrink-0 p-0" aria-label="Stop generating"><Icon name="stop" className="size-4" /></Button>
            ) : (
              <Button type="submit" size="sm" disabled={!input.trim()} className="size-9 shrink-0 p-0" aria-label="Send"><Icon name="send" className="size-[18px]" /></Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Sources ---------------- */
function SourceRow({ s, kbId, onDelete }: { s: Source; kbId: string; onDelete: (s: Source) => void }) {
  const { navigate } = useRouter();
  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/60 sm:px-5">
      <SourceGlyph type={s.type} />
      <button onClick={() => navigate(`/knowledge-bases/${kbId}/sources/${s.id}`)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium">{s.name}</p>
        <p className="font-mono text-xs text-muted">{s.meta} · added {s.added}</p>
      </button>
      <div className="hidden sm:block"><StatusBadge status={s.status} /></div>
      <Menu items={[
        { label: "View details", icon: "external", onClick: () => navigate(`/knowledge-bases/${kbId}/sources/${s.id}`) },
        { label: "Delete", icon: "trash", danger: true, onClick: () => onDelete(s) },
      ]} />
    </div>
  );
}

function SourceRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <Skeleton className="size-9 rounded-lg" />
      <div className="flex-1"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="mt-2 h-3 w-1/2" /></div>
      <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
    </div>
  );
}

function SourcesView({ kb, onSourcesChanged }: { kb: KnowledgeBase; onSourcesChanged?: () => void }) {
  const [filter, setFilter] = useState<"all" | "documents" | "youtube">("all");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [sources, setSources] = useState<Source[]>(kb.sources || []);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Source | null>(null);
  const toast = useToast();

  useEffect(() => {
    setSources(kb.sources || []);
  }, [kb.sources]);

  useEffect(() => { const t = setTimeout(() => setLoaded(true), 300); return () => clearTimeout(t); }, []);

  const removeSource = (s: Source) => {
    const index = sources.findIndex((x) => x.id === s.id);
    const updated = sources.filter((x) => x.id !== s.id);
    setSources(updated);

    try {
      const raw = localStorage.getItem("dm_kbs_cache");
      if (raw) {
        const list: KnowledgeBase[] = JSON.parse(raw);
        const newKbs = list.map((k) => (k.id === kb.id ? { ...k, sources: updated } : k));
        localStorage.setItem("dm_kbs_cache", JSON.stringify(newKbs));
      }
    } catch {}

    onSourcesChanged?.();

    toast(`"${s.name}" deleted`, "default", {
      label: "Undo",
      onClick: () => {
        const next = [...updated];
        next.splice(index, 0, s);
        setSources(next);
        try {
          const raw = localStorage.getItem("dm_kbs_cache");
          if (raw) {
            const list: KnowledgeBase[] = JSON.parse(raw);
            const newKbs = list.map((k) => (k.id === kb.id ? { ...k, sources: next } : k));
            localStorage.setItem("dm_kbs_cache", JSON.stringify(newKbs));
          }
        } catch {}
        onSourcesChanged?.();
      },
    });

    const token = localStorage.getItem("dm-token") || "";
    fetch(`${API_BASE}/sources/${s.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const list = (sources || []).filter((s) => {
    const mf = filter === "all" || (filter === "youtube" ? s.type === "youtube" : s.type !== "youtube");
    return mf && s.name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="w-full px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-xs"><SearchInput placeholder="Search sources…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="flex gap-1 rounded-lg border border-border bg-panel p-1">
          {(["all", "documents", "youtube"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cx("rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition-colors", filter === f ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground")}>{f}</button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {!loaded ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">{[0, 1, 2, 3].map((i) => <SourceRowSkeleton key={i} />)}</div>
        ) : list.length === 0 && sources.length === 0 ? (
          <EmptyState icon="sources" title="No sources yet" description="Add documents or YouTube videos to start asking questions." action={<Button icon="plus" onClick={() => setAdd(true)}>Add source</Button>} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="search"
            title="No sources match your filters"
            description={q ? `No sources match "${q}"${filter !== "all" ? ` in ${filter}` : ""}.` : `No ${filter} sources in this knowledge base.`}
            action={<Button variant="secondary" icon="close" onClick={() => { setQ(""); setFilter("all"); }}>Clear filters</Button>}
          />
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
            {list.map((s) => <SourceRow key={s.id} s={s} kbId={kb.id} onDelete={setPending} />)}
          </div>
        )}
      </div>
      <AddSourceModal
        open={add}
        onClose={() => setAdd(false)}
        kbId={kb.id}
        onAdded={() => {
          onSourcesChanged?.();
        }}
      />
      <ConfirmDialog
        open={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => { if (pending) removeSource(pending); }}
        title="Delete source?"
        description={pending ? `"${pending.name}" will be removed from ${kb.name}, along with its indexed chunks. You can undo this right after.` : ""}
        confirmLabel="Delete source"
      />
    </div>
  );
}

/* ---------------- Source Details ---------------- */
function SourceDetails({ kb, source }: { kb: KnowledgeBase; source: Source }) {
  const { navigate, query } = useRouter();
  const toast = useToast();
  const loc = query.get("loc");
  const highlightRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (loc) highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loc]);
  const [confirm, setConfirm] = useState(false);
  const isYt = source.type === "youtube";

  const facts = isYt
    ? [["Type", "YouTube video"], ["Duration", source.duration ?? "—"], ["Transcript", source.status === "ready" ? "Indexed" : "Pending"], ["Added", source.added]]
    : [["Type", source.type.toUpperCase()], ["Pages", source.pages ? String(source.pages) : "—"], ["Chunks", source.chunks ? String(source.chunks) : "—"], ["Added", source.added]];

  return (
    <div className="w-full max-w-5xl px-6 py-8 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <SourceGlyph type={source.type} className="size-12" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{source.name}</h1>
            <div className="mt-2"><StatusBadge status={source.status} /></div>
          </div>
        </div>
        <Button variant="destructive" size="sm" icon="trash" onClick={() => setConfirm(true)}>Delete source</Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => { toast("Source deleted", "error"); navigate(`/knowledge-bases/${kb.id}/sources`); }}
        title="Delete source?"
        description={`"${source.name}" will be permanently removed from ${kb.name}, along with its indexed chunks. This cannot be undone.`}
        confirmLabel="Delete source"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold">{isYt ? "Transcript preview" : "Document preview"}</h2>
          {loc && (
            <div ref={highlightRef} className="dm-fade-up mt-3 flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 ring-2 ring-accent/15">
              <Icon name="quote" className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-foreground">Cited from your answer</p>
                <p className="mt-0.5 text-muted">Jumped to <span className="font-mono font-medium text-accent">{loc}</span> — the passage referenced by the assistant is highlighted below.</p>
              </div>
            </div>
          )}
          {source.status === "failed" ? (
            <div className="mt-4 rounded-xl border border-failed/20 bg-failed-soft px-4 py-6 text-center text-sm text-failed">
              <Icon name="close" className="mx-auto mb-2 size-6" />
              Processing failed. The file may be corrupted or unsupported.
              <div className="mt-3"><Button size="sm" variant="secondary" icon="retry">Retry processing</Button></div>
            </div>
          ) : isYt ? (
            <div className="mt-3">
              <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-surface text-muted"><Icon name="youtube" className="size-10 text-failed" /></div>
              <p className={cx("mt-3 rounded-lg p-2 text-sm leading-relaxed text-muted transition-colors", loc && "bg-accent-soft/60 ring-1 ring-accent/20")}>{loc ?? "00:12"} — Video transcript indexed and ready for hybrid retrieval.</p>
            </div>
          ) : (
            <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
              <p>Document parsed and indexed into vector chunks by the Python backend.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Details</h2>
            <dl className="mt-3 space-y-2.5">
              {facts.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <dt className="text-muted">{k}</dt><dd className="font-mono">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          {isYt && source.url && (
            <div className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
              <h2 className="text-sm font-semibold">Source URL</h2>
              <a href={source.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 break-all text-[13px] text-accent hover:underline">{source.url}<Icon name="external" className="size-3.5 shrink-0" /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Router-facing entry ---------------- */
export function Workspace({ id, sub, sourceId }: { id: string; sub: "chat" | "sources"; sourceId?: string }) {
  const { kb, updateKBName, reloadKB } = useKB(id);
  const { navigate } = useRouter();
  if (!kb) {
    return <div className="p-10"><EmptyState icon="library" title="Knowledge base not found" description="It may have been deleted." action={<Button onClick={() => navigate("/knowledge-bases")}>Back to knowledge bases</Button>} /></div>;
  }
  if (sub === "sources" && sourceId) {
    const source = (kb.sources || []).find((s) => s.id === sourceId);
    if (source) return <div className="flex h-full flex-col"><WorkspaceHeader kb={kb} tab="sources" sourceName={source.name} onRenamed={updateKBName} onSourcesChanged={reloadKB} /><div className="flex-1 overflow-y-auto"><SourceDetails kb={kb} source={source} /></div></div>;
  }
  return (
    <div className="flex h-full flex-col">
      <WorkspaceHeader kb={kb} tab={sub} onRenamed={updateKBName} onSourcesChanged={reloadKB} />
      {sub === "chat" ? <ChatView kb={kb} /> : <div className="flex-1 overflow-y-auto"><SourcesView kb={kb} onSourcesChanged={reloadKB} /></div>}
    </div>
  );
}

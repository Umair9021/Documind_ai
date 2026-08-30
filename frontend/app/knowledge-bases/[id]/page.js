"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "../../../components/AppShell";
import {
  Button,
  Breadcrumbs,
  ConfirmDialog,
  EmptyState,
  Icon,
  SearchInput,
  StatusBadge,
  SourceGlyph,
  Menu,
  Tabs,
  Badge,
  Skeleton,
  cx,
  useToast,
} from "../../../components/ui";
import { AddSourceModal } from "../../../components/modals";

const suggestions = [
  "What is the difference between BM25 and vector search?",
  "Summarise the key ideas from the Advanced RAG paper",
  "How does reranking improve retrieval quality?",
];

function CitationCard({ c, kbId }) {
  const router = useRouter();
  const toast = useToast();

  const handleOpenSource = () => {
    toast(`Viewing citation from ${c.source_name || c.source}`);
  };

  return (
    <button
      onClick={handleOpenSource}
      className="group flex h-full w-full flex-col rounded-xl border border-border bg-surface/60 p-3 text-left transition-all hover:border-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="flex items-center gap-2.5">
        <SourceGlyph type={c.source_type || c.type || "doc"} className="size-7" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">
            {c.source_name || c.source}
          </p>
          <p className="truncate font-mono text-[11px] text-accent">
            {c.page_number
              ? `Page ${c.page_number}`
              : c.timestamp
              ? c.timestamp
              : c.section_name || c.locator || "Citation"}
          </p>
        </div>
        <Icon
          name="arrow-right"
          className="size-4 shrink-0 text-faint transition-colors group-hover:text-accent"
        />
      </div>
    </button>
  );
}

function MessageActions({ content, onRegenerate }) {
  const toast = useToast();
  const [vote, setVote] = useState(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {}
      document.body.removeChild(ta);
    }
    toast("Answer copied to clipboard");
  };

  const btn =
    "flex items-center justify-center rounded-lg p-1.5 text-faint transition-colors hover:bg-surface hover:text-foreground";

  return (
    <div className="mt-3 flex items-center gap-1">
      <button onClick={copy} className={btn} aria-label="Copy answer">
        <Icon name="copy" className="size-4" />
      </button>
      <button onClick={onRegenerate} className={btn} aria-label="Regenerate answer">
        <Icon name="retry" className="size-4" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" />
      <button
        onClick={() => {
          setVote("up");
          toast("Thanks for the feedback");
        }}
        className={cx(
          btn,
          vote === "up" && "bg-emerald-500/10 text-emerald-500"
        )}
        aria-label="Good answer"
      >
        <Icon name="thumb-up" className="size-4" />
      </button>
      <button
        onClick={() => {
          setVote("down");
          toast("Thanks for the feedback");
        }}
        className={cx(
          btn,
          vote === "down" && "bg-red-500/10 text-red-500"
        )}
        aria-label="Bad answer"
      >
        <Icon name="thumb-down" className="size-4" />
      </button>
    </div>
  );
}

function Bubble({ m, kbId, onRegenerate }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end dm-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm sm:max-w-[75%]">
          {m.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3.5 dm-fade-up items-start">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
        <Icon name="sparkle" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
          {m.content}
        </div>

        {m.citations && m.citations.length > 0 && (
          <div className="mt-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
              <Icon name="quote" className="size-3.5" /> SOURCES
            </p>
            <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1">
              {m.citations.map((c, i) => (
                <div key={i} className="w-56 shrink-0 snap-start sm:w-64">
                  <CitationCard c={c} kbId={kbId} />
                </div>
              ))}
            </div>
          </div>
        )}

        <MessageActions content={m.content} onRegenerate={onRegenerate} />
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex gap-3.5 dm-fade-up items-start">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm">
        <Icon name="sparkle" className="size-4" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 text-muted">
        <span className="size-2 animate-bounce rounded-full bg-accent" />
        <span className="size-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
        <span className="size-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
        <span className="ml-2 text-[13px] font-medium">Retrieving from your sources…</span>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const kbId = params.id;

  const [kb, setKb] = useState(null);
  const [sources, setSources] = useState([]);
  const [tab, setTab] = useState("chat");
  const [addModal, setAddModal] = useState(false);
  const [deleteSourcePending, setDeleteSourcePending] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  // Sources Filter State
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  const fetchKBDetails = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/kb/${kbId}`);
      if (res.ok) {
        const data = await res.json();
        setKb(data);
      } else {
        setKb({
          id: kbId,
          name: kbId === "kb_generative_ai_001" ? "Generative AI Course" : "Knowledge Base",
          description: "Source-grounded research workspace.",
          updated: "recently",
        });
      }
    } catch (e) {
      setKb({ id: kbId, name: "Knowledge Base", updated: "recently" });
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/sources/kb/${kbId}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (kbId) {
      fetchKBDetails();
      fetchSources();
    }
  }, [kbId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const handleSendMessage = async (text) => {
    const q = text.trim();
    if (!q || thinking) return;

    setInput("");
    const userMsg = { id: `u_${Date.now()}`, role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kb_id: kbId,
          query: q,
          retrieval_strategy: "hybrid_rrf",
          top_k: 6,
        }),
      });

      if (!res.ok) throw new Error("Query execution failed");
      const data = await res.json();

      const assistantMsg = {
        id: `a_${Date.now()}`,
        role: "assistant",
        content: data.answer,
        citations: data.citations || [],
        retrieval_strategy: data.retrieval_strategy,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save to chat history in localStorage
      try {
        const history = JSON.parse(localStorage.getItem("documind-conversations") || "[]");
        const convTitle = q.length > 28 ? q.slice(0, 28) + "..." : q;
        const exists = history.find((c) => c.title === convTitle);
        if (!exists) {
          const updatedHistory = [
            {
              id: `conv_${Date.now()}`,
              kbId: kbId,
              kbName: kb?.name || "Knowledge Base",
              title: convTitle,
              updatedAt: Date.now(),
            },
            ...history,
          ];
          localStorage.setItem("documind-conversations", JSON.stringify(updatedHistory));
        }
      } catch (e) {}
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "I couldn't retrieve an answer right now. Please verify your backend connection.",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleRegenerate = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      handleSendMessage(lastUser.content);
    }
  };

  const handleDeleteSource = async () => {
    if (!deleteSourcePending) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/sources/${deleteSourcePending.id}`, {
        method: "DELETE",
      });
      toast(`"${deleteSourcePending.name}" deleted`);
      setSources((prev) => prev.filter((s) => s.id !== deleteSourcePending.id));
    } catch (e) {
      toast(`Deleted "${deleteSourcePending.name}"`);
      setSources((prev) => prev.filter((s) => s.id !== deleteSourcePending.id));
    } finally {
      setDeleteSourcePending(null);
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesFilter =
      sourceFilter === "all" ||
      (sourceFilter === "youtube" ? s.source_type === "youtube" : s.source_type !== "youtube");
    return matchesFilter && s.name.toLowerCase().includes(sourceSearch.toLowerCase());
  });

  const crumbs = [
    { label: "Knowledge bases", to: "/knowledge-bases" },
    { label: kb?.name || "Knowledge Base" },
  ];

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        {/* Workspace Top Header */}
        <div className="border-b border-border bg-panel">
          <div className="mx-auto max-w-5xl px-5 pt-3 sm:px-8 sm:pt-5">
            <div className="mb-3 hidden sm:block">
              <Breadcrumbs items={crumbs} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl text-foreground">
                  {kb?.name || "Knowledge Base"}
                </h1>
                <p className="mt-0.5 hidden font-mono text-xs text-muted sm:block">
                  {sources.length} sources · updated recently
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tab === "chat" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="plus"
                    onClick={() => setMessages([])}
                  >
                    New chat
                  </Button>
                )}
                {tab === "sources" && (
                  <Button size="sm" icon="plus" onClick={() => setAddModal(true)}>
                    Add source
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              <Tabs
                tabs={[
                  { id: "chat", label: "Chat", icon: "chat" },
                  { id: "sources", label: "Sources", icon: "sources", count: sources.length },
                ]}
                active={tab}
                onChange={(t) => setTab(t)}
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Chat Workspace */}
        {tab === "chat" ? (
          <div className="flex min-h-0 flex-1 flex-col justify-between">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-5 py-6 sm:px-8">
                {messages.length === 0 && !thinking ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                      <Icon name="sparkle" className="size-7" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                      Ask anything about your knowledge
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-muted">
                      Your answers are generated from the sources in this knowledge base, with citations
                      you can verify.
                    </p>
                    <div className="mt-7 w-full max-w-lg space-y-2 text-left">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSendMessage(s)}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-sm text-foreground transition-colors hover:border-accent hover:bg-accent-soft/40"
                        >
                          <span>{s}</span>
                          <Icon name="arrow-right" className="size-4 shrink-0 text-faint" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-7">
                    {messages.map((m) => (
                      <Bubble
                        key={m.id}
                        m={m}
                        kbId={kbId}
                        onRegenerate={handleRegenerate}
                      />
                    ))}
                    {thinking && <Thinking />}
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-border bg-panel px-5 py-4 sm:px-8">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(input);
                }}
                className="mx-auto max-w-3xl"
              >
                <div className="flex items-center gap-2 rounded-2xl border border-border-strong bg-panel p-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(input);
                      }
                    }}
                    rows={1}
                    placeholder="Ask anything about your knowledge…"
                    disabled={thinking}
                    className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-faint focus:outline-none disabled:opacity-60"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || thinking}
                    className="size-9 shrink-0 p-0"
                    aria-label="Send"
                  >
                    <Icon name="send" className="size-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Tab 2: Sources View */
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="w-full sm:max-w-xs">
                  <SearchInput
                    placeholder="Search sources…"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 rounded-xl border border-border bg-panel p-1">
                  {["all", "documents", "youtube"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSourceFilter(f)}
                      className={cx(
                        "rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors",
                        sourceFilter === f
                          ? "bg-accent-soft text-accent font-semibold"
                          : "text-muted hover:text-foreground"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                {filteredSources.length === 0 && sources.length === 0 ? (
                  <EmptyState
                    icon="sources"
                    title="No sources yet"
                    description="Add documents or YouTube videos to start asking questions."
                    action={
                      <Button icon="plus" onClick={() => setAddModal(true)}>
                        Add source
                      </Button>
                    }
                  />
                ) : filteredSources.length === 0 ? (
                  <EmptyState
                    icon="search"
                    title="No sources match your filters"
                    description={`No sources match "${sourceSearch}".`}
                    action={
                      <Button
                        variant="secondary"
                        icon="close"
                        onClick={() => {
                          setSourceSearch("");
                          setSourceFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
                    {filteredSources.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface/60 sm:px-5"
                      >
                        <SourceGlyph type={s.source_type} />
                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                          <p className="font-mono text-xs text-muted">
                            {s.source_type.toUpperCase()} ·{" "}
                            {s.file_size_bytes
                              ? `${(s.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`
                              : "video"}{" "}
                            · added recently
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          <StatusBadge status={s.status || "ready"} />
                        </div>
                        <Menu
                          items={[
                            {
                              label: "Delete",
                              icon: "trash",
                              danger: true,
                              onClick: () => setDeleteSourcePending(s),
                            },
                          ]}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Source Modal */}
        <AddSourceModal
          open={addModal}
          onClose={() => setAddModal(false)}
          kbId={kbId}
          onSourceAdded={() => {
            fetchSources();
            fetchKBDetails();
          }}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          open={!!deleteSourcePending}
          onClose={() => setDeleteSourcePending(null)}
          onConfirm={handleDeleteSource}
          title="Delete source?"
          description={
            deleteSourcePending
              ? `"${deleteSourcePending.name}" will be removed from this knowledge base, along with its indexed chunks.`
              : ""
          }
          confirmLabel="Delete source"
        />
      </div>
    </AppShell>
  );
}

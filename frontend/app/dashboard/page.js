"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeader } from "../../components/AppShell";
import { Button, EmptyState, Icon, Menu, Skeleton, useToast } from "../../components/ui";
import { CreateKBModal } from "../../components/modals";

function KBCard({ kb, onDelete }) {
  const router = useRouter();
  const toast = useToast();
  const readyCount = kb.source_count || kb.sources?.length || 0;

  return (
    <div className="group flex flex-col justify-between rounded-2xl border border-border bg-panel p-5 transition-all hover:border-border-strong hover:shadow-sm">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Icon name="library" className="size-5" />
          </div>
          <Menu
            items={[
              {
                label: "Rename",
                icon: "doc",
                onClick: () => toast("Rename feature coming soon!"),
              },
              {
                label: "Delete",
                icon: "trash",
                danger: true,
                onClick: () => onDelete(kb),
              },
            ]}
          />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">{kb.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
          {kb.description || "Source-grounded research workspace."}
        </p>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-4 font-mono text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <Icon name="sources" className="size-3.5" />
            {kb.source_count || kb.sources?.length || 0} sources
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="clock" className="size-3.5" />
            Recently active
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-muted">{readyCount} ready</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => router.push(`/knowledge-bases/${kb.id}`)}
            icon="arrow-right"
            iconPosition="right"
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}

function KBCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-panel p-5">
      <Skeleton className="size-10 rounded-xl" />
      <Skeleton className="mt-4 h-4 w-2/3" />
      <Skeleton className="mt-2.5 h-3 w-full" />
      <Skeleton className="mt-1.5 h-3 w-4/5" />
      <div className="mt-5 flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [modal, setModal] = useState(false);
  const [kbs, setKbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();

  const fetchKnowledgeBases = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/v1/kb/");
      if (res.ok) {
        const data = await res.json();
        setKbs(data);
      } else {
        // Fallback seed knowledge bases if backend is loading
        setKbs([
          {
            id: "kb_generative_ai_001",
            name: "Generative AI Course",
            description: "Lecture notes, papers and video lectures for the graduate GenAI research.",
            source_count: 6,
          },
          {
            id: "kb_5dbed72a7c4f",
            name: "British Wildlife & Finance",
            description: "Documentaries, research papers and market analysis reports.",
            source_count: 2,
          },
          {
            id: "kb_backend_onboarding",
            name: "Backend Onboarding",
            description: "Internal service docs, runbooks and architecture decision records.",
            source_count: 4,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledgeBases();
  }, []);

  const handleCreate = async (name, description) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/kb/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (res.ok) {
        const newKb = await res.json();
        setModal(false);
        toast(`Knowledge base "${name}" created!`);
        router.push(`/knowledge-bases/${newKb.id}`);
      } else {
        setModal(false);
        toast(`Knowledge base "${name}" created!`);
        fetchKnowledgeBases();
      }
    } catch (err) {
      toast(`Created "${name}"`);
      setModal(false);
    }
  };

  const handleDelete = async (kb) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/v1/kb/${kb.id}`, { method: "DELETE" });
      setKbs((prev) => prev.filter((item) => item.id !== kb.id));
      toast(`"${kb.name}" deleted`);
    } catch (err) {
      setKbs((prev) => prev.filter((item) => item.id !== kb.id));
      toast(`"${kb.name}" deleted`);
    }
  };

  const totalSources = kbs.reduce((acc, k) => acc + (k.source_count || k.sources?.length || 0), 0);

  // Time-aware greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning, Aditi" : hour < 18 ? "Good afternoon, Aditi" : "Good evening, Aditi";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {/* Header */}
        <PageHeader
          title={greeting}
          subtitle="Manage your knowledge bases and continue your research."
          actions={
            <Button icon="plus" onClick={() => setModal(true)}>
              Create knowledge base
            </Button>
          }
        />

        {/* Stats Summary Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-2xl border border-border bg-panel p-5 transition-colors">
            <div className="flex items-center gap-2 text-muted">
              <Icon name="library" className="size-4" />
              <span className="text-[13px] font-medium">Knowledge bases</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-14" />
            ) : (
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
                {kbs.length}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-panel p-5 transition-colors">
            <div className="flex items-center gap-2 text-muted">
              <Icon name="sources" className="size-4" />
              <span className="text-[13px] font-medium">Total sources</span>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-9 w-14" />
            ) : (
              <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
                {totalSources}
              </p>
            )}
          </div>
        </div>

        {/* Knowledge Bases Section */}
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your knowledge bases
            </h2>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <KBCardSkeleton key={i} />
              ))}
            </div>
          ) : kbs.length === 0 ? (
            <EmptyState
              icon="library"
              title="You haven't created a knowledge base yet"
              description="Create a knowledge base to start uploading sources and asking questions."
              action={
                <Button icon="plus" onClick={() => setModal(true)}>
                  Create your first knowledge base
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kbs.map((kb) => (
                <KBCard key={kb.id} kb={kb} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>

        {/* Create Knowledge Base Modal */}
        <CreateKBModal
          open={modal}
          onClose={() => setModal(false)}
          onCreate={handleCreate}
        />
      </div>
    </AppShell>
  );
}

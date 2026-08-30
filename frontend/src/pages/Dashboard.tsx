import { useEffect, useState } from "react";
import { useRouter } from "../lib/router";
import { PageHeader } from "../components/AppShell";
import { Button, EmptyState, Icon, SearchInput, Menu, Skeleton, useToast } from "../components/ui";
import { CreateKBModal, RenameKBModal } from "../components/modals";
import { knowledgeBases as seedKBs } from "../lib/data";
import type { KnowledgeBase, Source } from "../lib/data";
import { API_BASE } from "../lib/supabase";

function useLoaded(delay = 650) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), delay); return () => clearTimeout(t); }, [delay]);
  return loaded;
}

function KBCard({
  kb,
  onDelete,
  onRename,
}: {
  kb: KnowledgeBase;
  onDelete: (kb: KnowledgeBase) => void;
  onRename: (kb: KnowledgeBase) => void;
}) {
  const { navigate } = useRouter();
  const ready = kb.sources ? kb.sources.filter((s) => s.status === "ready").length : 0;
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-panel p-5 transition-all hover:border-border-strong hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon name="library" className="size-5" /></div>
        <Menu items={[
          { label: "Rename", icon: "doc", onClick: () => onRename(kb) },
          { label: "Delete", icon: "trash", danger: true, onClick: () => onDelete(kb) },
        ]} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{kb.name}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm leading-relaxed text-muted">{kb.description}</p>
      <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted">
        <span className="flex items-center gap-1.5"><Icon name="sources" className="size-3.5" />{kb.sources ? kb.sources.length : 0} sources</span>
        <span className="flex items-center gap-1.5"><Icon name="clock" className="size-3.5" />{kb.updated || "recently"}</span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted">{ready} ready</span>
        <Button size="sm" variant="secondary" onClick={() => navigate(`/knowledge-bases/${kb.id}`)}>Open<Icon name="arrow-right" className="size-4" /></Button>
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
      <div className="mt-4 flex gap-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-16" /></div>
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4"><Skeleton className="h-3 w-12" /><Skeleton className="h-8 w-20" /></div>
    </div>
  );
}

const STORAGE_KEY = "dm_kbs_cache";

function getCachedKBs(): KnowledgeBase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCachedKBs(kbs: KnowledgeBase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kbs));
  } catch {}
}

/* shared optimistic-delete & rename hook with live backend and persistent storage */
function useKBList() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>(getCachedKBs);
  const toast = useToast();

  const getHeaders = () => {
    const token = localStorage.getItem("dm-token") || "";
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchKBs = async () => {
    const token = localStorage.getItem("dm-token") || "";
    try {
      const res = await fetch(`${API_BASE}/knowledge-bases/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = await Promise.all(
            data.map(async (d: any) => {
              let sourcesList: Source[] = [];
              try {
                const sRes = await fetch(`${API_BASE}/sources/kb/${d.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (sRes.ok) {
                  const sData = await sRes.json();
                  if (Array.isArray(sData)) {
                    sourcesList = sData.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      type: s.source_type || "pdf",
                      status: s.status || "ready",
                      added: "recently",
                      meta: `${(s.source_type || "doc").toUpperCase()}${s.file_size_bytes ? ` · ${(s.file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : ""}`,
                    }));
                  }
                }
              } catch {}
              return {
                id: d.id,
                name: d.name,
                description: d.description || "",
                sources: sourcesList,
                updated: "Recently active",
              };
            })
          );
          setKbs(formatted);
          saveCachedKBs(formatted);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchKBs();
  }, []);

  const remove = async (kb: KnowledgeBase) => {
    const token = localStorage.getItem("dm-token") || "";
    const index = kbs.findIndex((k) => k.id === kb.id);
    const updated = kbs.filter((k) => k.id !== kb.id);
    setKbs(updated);
    saveCachedKBs(updated);

    toast(`"${kb.name}" deleted`, "default", {
      label: "Undo",
      onClick: () => {
        const next = [...updated];
        next.splice(index, 0, kb);
        setKbs(next);
        saveCachedKBs(next);
      },
    });

    try {
      await fetch(`${API_BASE}/knowledge-bases/${kb.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {}
  };

  const addKB = async (name: string, desc = "") => {
    const tempId = `kb_${Math.random().toString(36).slice(2, 10)}`;
    const newKb: KnowledgeBase = {
      id: tempId,
      name,
      description: desc,
      sources: [],
      updated: "just now",
    };

    const nextList = [newKb, ...kbs];
    setKbs(nextList);
    saveCachedKBs(nextList);
    toast(`Knowledge base "${name}" created!`);

    try {
      const res = await fetch(`${API_BASE}/knowledge-bases/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name, description: desc }),
      });
      if (res.ok) {
        const created = await res.json();
        if (created.id) {
          const finalKb = { ...newKb, id: created.id };
          const replaced = [finalKb, ...kbs.filter((k) => k.id !== tempId)];
          setKbs(replaced);
          saveCachedKBs(replaced);
          return created.id;
        }
      }
    } catch (e) {}

    return tempId;
  };

  const renameKB = async (id: string, name: string, desc: string) => {
    const updated = kbs.map((k) => (k.id === id ? { ...k, name, description: desc } : k));
    setKbs(updated);
    saveCachedKBs(updated);
    toast(`Knowledge base updated to "${name}"`);

    try {
      await fetch(`${API_BASE}/knowledge-bases/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ name, description: desc }),
      });
    } catch (e) {}
  };

  return { kbs, remove, addKB, renameKB, reload: fetchKBs };
}

export function Dashboard() {
  const [modal, setModal] = useState(false);
  const [renameKb, setRenameKb] = useState<KnowledgeBase | null>(null);
  const { navigate } = useRouter();
  const toast = useToast();
  const loaded = useLoaded();
  const { kbs, remove, addKB, renameKB } = useKBList();
  const totalSources = kbs.reduce((n, k) => n + k.sources.length, 0);

  const [userName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("dm-user") || "{}");
      return u.full_name || "Scholar";
    } catch {
      return "Scholar";
    }
  });

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  })();

  const create = async (name: string, desc = "") => {
    setModal(false);
    const newId = await addKB(name, desc);
    toast(`"${name}" created`);
    if (newId) navigate(`/knowledge-bases/${newId}`);
  };

  return (
    <div className="w-full px-4 py-5 sm:px-8 sm:py-8">
      <PageHeader
        title={`${greeting}, ${userName}`}
        subtitle="Manage your private knowledge bases and continue your research."
        actions={<Button icon="plus" className="w-full sm:w-auto" onClick={() => setModal(true)}>Create knowledge base</Button>}
      />

      <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4 sm:max-w-md">
        {[
          { label: "Knowledge bases", value: kbs.length, icon: "library" as const },
          { label: "Total sources", value: totalSources, icon: "sources" as const },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-panel p-4 sm:p-5">
            <div className="flex items-center gap-2 text-muted"><Icon name={s.icon} className="size-4" /><span className="text-xs sm:text-[13px]">{s.label}</span></div>
            {loaded ? <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold tracking-tight">{s.value}</p> : <Skeleton className="mt-2 h-9 w-14" />}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your knowledge bases</h2>
        </div>
        {!loaded ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2].map((i) => <KBCardSkeleton key={i} />)}</div>
        ) : kbs.length === 0 ? (
          <EmptyState icon="library" title="You haven't created a knowledge base yet" description="Create a knowledge base to start uploading sources and asking questions." action={<Button icon="plus" onClick={() => setModal(true)}>Create your first knowledge base</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {kbs.map((kb) => (
              <KBCard
                key={kb.id}
                kb={kb}
                onDelete={remove}
                onRename={(k) => setRenameKb(k)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateKBModal open={modal} onClose={() => setModal(false)} onCreate={create} />
      <RenameKBModal
        open={!!renameKb}
        onClose={() => setRenameKb(null)}
        kb={renameKb}
        onRename={renameKB}
      />
    </div>
  );
}

export function KnowledgeBases() {
  const [modal, setModal] = useState(false);
  const [renameKb, setRenameKb] = useState<KnowledgeBase | null>(null);
  const [q, setQ] = useState("");
  const { navigate } = useRouter();
  const toast = useToast();
  const loaded = useLoaded();
  const { kbs, remove, addKB, renameKB } = useKBList();
  const list = kbs.filter((k) => k.name.toLowerCase().includes(q.toLowerCase()));
  const create = async (name: string, desc = "") => {
    setModal(false);
    const newId = await addKB(name, desc);
    toast(`"${name}" created`);
    if (newId) navigate(`/knowledge-bases/${newId}`);
  };

  return (
    <div className="w-full px-6 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Knowledge bases" subtitle="All of your private, source-grounded workspaces." actions={<Button icon="plus" onClick={() => setModal(true)}>Create knowledge base</Button>} />
      <div className="mt-6 max-w-sm"><SearchInput placeholder="Search knowledge bases…" value={q} onChange={(e) => setQ(e.target.value)} /></div>

      {!loaded ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2].map((i) => <KBCardSkeleton key={i} />)}</div>
      ) : list.length === 0 ? (
        <div className="mt-6"><EmptyState icon="search" title="No matches" description={`No knowledge bases match "${q}".`} action={<Button variant="secondary" icon="close" onClick={() => setQ("")}>Clear search</Button>} /></div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((kb) => (
            <KBCard
              key={kb.id}
              kb={kb}
              onDelete={remove}
              onRename={(k) => setRenameKb(k)}
            />
          ))}
        </div>
      )}
      <CreateKBModal open={modal} onClose={() => setModal(false)} onCreate={create} />
      <RenameKBModal
        open={!!renameKb}
        onClose={() => setRenameKb(null)}
        kb={renameKb}
        onRename={renameKB}
      />
    </div>
  );
}
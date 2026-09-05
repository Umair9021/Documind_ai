import { useState, useEffect } from "react";
import { Button, Field, Icon, Input, Modal, SourceGlyph, StatusBadge, cx, useToast } from "./ui";
import { knowledgeBases } from "../lib/data";
import type { SourceStatus, Source, KnowledgeBase } from "../lib/data";
import { API_BASE } from "../lib/supabase";

export function CreateKBModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, desc?: string) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), desc.trim());
      setName(""); setDesc("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create knowledge base"
      description="Group related documents and videos into one searchable workspace."
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} disabled={!name.trim() || loading}>{loading ? "Creating…" : "Create knowledge base"}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Knowledge base name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Generative AI Course" autoFocus />
        </Field>
        <Field label="Description" hint="Optional — helps you and collaborators recognise it later.">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="What is this knowledge base about?"
            className="w-full resize-none rounded-lg border border-border-strong bg-panel px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>
    </Modal>
  );
}

export function RenameKBModal({
  open,
  onClose,
  kb,
  onRename,
}: {
  open: boolean;
  onClose: () => void;
  kb: { id: string; name: string; description?: string } | null;
  onRename: (id: string, name: string, desc: string) => Promise<void> | void;
}) {
  const [name, setName] = useState(kb?.name || "");
  const [desc, setDesc] = useState(kb?.description || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(kb?.name || "");
    setDesc(kb?.description || "");
  }, [kb]);

  const submit = async () => {
    if (!name.trim() || !kb || loading) return;
    setLoading(true);
    try {
      await onRename(kb.id, name.trim(), desc.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rename knowledge base"
      footer={<><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={submit} disabled={!name.trim() || loading}>{loading ? "Saving…" : "Save changes"}</Button></>}
    >
      <div className="space-y-4">
        <Field label="Knowledge base name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Generative AI Course"
            autoFocus
          />
        </Field>
        <Field label="Description" hint="Optional description of this workspace.">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="What is this knowledge base about?"
            className="w-full resize-none rounded-lg border border-border-strong bg-panel px-3.5 py-2.5 text-sm placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </Field>
      </div>
    </Modal>
  );
}

type UploadRow = {
  id: string;
  name: string;
  type: string;
  status: SourceStatus;
  stageText: string;
  progress: number;
};

export function AddSourceModal({ open, onClose, kbId, onAdded }: { open: boolean; onClose: () => void; kbId?: string; onAdded?: () => void }) {
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setUploading(true);

    const initialRows: UploadRow[] = fileList.map((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "pdf";
      return {
        id: `upl_${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type: ext,
        status: "processing",
        stageText: "Uploading file to server...",
        progress: 15,
      };
    });

    setRows((r) => [...initialRows, ...r]);

    if (kbId) {
      const token = localStorage.getItem("dm-token") || "";
      const formData = new FormData();
      formData.append("kb_id", kbId);
      fileList.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch(`${API_BASE}/sources/upload/stream`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Upload failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                try {
                  const eventData = JSON.parse(trimmed.slice(6));
                  const targetFileName = eventData.fileName;
                  if (eventData.stage === "error") {
                    setRows((prev) =>
                      prev.map((item) =>
                        !targetFileName || item.name === targetFileName
                          ? { ...item, status: "failed", stageText: eventData.message, progress: 100 }
                          : item
                      )
                    );
                    toast(eventData.message, "error");
                  } else if (eventData.stage === "complete") {
                    setRows((prev) =>
                      prev.map((item) =>
                        !targetFileName || item.name === targetFileName
                          ? {
                              ...item,
                              status: "ready",
                              stageText: eventData.message,
                              progress: 100,
                            }
                          : item
                      )
                    );
                    toast(`Indexed ${targetFileName || "file"} successfully!`);
                    onAdded?.();
                  } else {
                    setRows((prev) =>
                      prev.map((item) =>
                        !targetFileName || item.name === targetFileName
                          ? {
                              ...item,
                              stageText: eventData.message || item.stageText,
                              progress: eventData.progress !== undefined ? eventData.progress : item.progress,
                            }
                          : item
                      )
                    );
                  }
                } catch (e) {}
              }
            }
          }
        }
      } catch (err: any) {
        setRows((prev) =>
          prev.map((item) =>
            fileList.some((f) => f.name === item.name)
              ? { ...item, status: "failed", stageText: err.message || "Network connection error", progress: 100 }
              : item
          )
        );
        toast(err.message || "Network error during document upload", "error");
      } finally {
        setUploading(false);
      }
    } else {
      setTimeout(() => {
        setRows((r) => r.map((item) => ({ ...item, status: "ready", stageText: "Ready", progress: 100 })));
        toast(`Uploaded ${files.length} file(s)`);
        setUploading(false);
      }, 800);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add document" description="Upload documents to be chunked, embedded, and indexed for semantic search and Q&A." size="lg">
      <div className="space-y-4">
        <label className={cx(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center transition-colors",
          uploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-accent hover:bg-accent-soft/40"
        )}>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Icon name="upload" className="mb-3 size-7 text-accent" />
          <p className="text-sm font-medium">{uploading ? "Processing documents..." : <>Drag & drop files, or <span className="text-accent">browse</span></>}</p>
          <p className="mt-1 text-xs text-muted">PDF, DOCX, TXT, Markdown, CSV, XLSX · 50 MB storage quota per account</p>
        </label>

        {rows.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[13px] font-medium text-muted">Real-Time Ingestion Pipeline</p>
            {rows.map((r) => (
              <div key={r.id || r.name} className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-3 shadow-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SourceGlyph type={r.type as any} className="size-7 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{r.name}</p>
                      <p className="truncate text-xs font-mono text-muted">{r.stageText}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted">{r.progress}%</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
                {r.status === "processing" && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                      style={{ width: `${r.progress}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

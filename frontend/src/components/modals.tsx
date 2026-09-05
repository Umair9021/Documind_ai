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
  const [tab, setTab] = useState<"upload" | "youtube">("upload");
  const [url, setUrl] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [showManualPaste, setShowManualPaste] = useState(false);
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

  const addVideo = async () => {
    if (!url.trim()) return;
    const currentUrl = url.trim();
    const token = localStorage.getItem("dm-token") || "";
    setUploading(true);

    const rowId = `yt_${Math.random().toString(36).slice(2, 8)}`;
    const newRow: UploadRow = {
      id: rowId,
      name: currentUrl.includes("v=") ? `YouTube Video (${currentUrl.split("v=")[1]?.slice(0, 8)})` : "YouTube Lecture",
      type: "youtube",
      status: "processing",
      stageText: "Connecting to YouTube gateway...",
      progress: 10,
    };

    setRows((r) => [newRow, ...r]);
    setUrl("");

    if (kbId) {
      try {
        const payload: any = { kb_id: kbId, url: currentUrl };
        if (transcriptText.trim().length > 20) {
          payload.client_transcript_text = transcriptText.trim();
        }

        const res = await fetch(`${API_BASE}/sources/youtube/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error (${res.status})`);
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
                  if (eventData.stage === "error") {
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === rowId
                          ? { ...item, status: "failed", stageText: eventData.message, progress: 100 }
                          : item
                      )
                    );
                    toast(eventData.message, "error");
                  } else if (eventData.stage === "complete") {
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === rowId
                          ? {
                              ...item,
                              name: eventData.source?.name || item.name,
                              status: "ready",
                              stageText: eventData.message,
                              progress: 100,
                            }
                          : item
                      )
                    );
                    toast("YouTube video processed and indexed with verbatim dialogue!");
                    onAdded?.();
                  } else {
                    setRows((prev) =>
                      prev.map((item) =>
                        item.id === rowId
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
            item.id === rowId ? { ...item, status: "failed", stageText: err.message || "Network error", progress: 100 } : item
          )
        );
        toast(err.message || "Network error during YouTube processing", "error");
      } finally {
        setUploading(false);
      }
    } else {
      setTimeout(() => {
        setRows((r) =>
          r.map((item) => (item.id === rowId ? { ...item, status: "ready", stageText: "Ready", progress: 100 } : item))
        );
        toast("YouTube video added");
        setUploading(false);
      }, 900);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add source" description="Documents and YouTube videos are chunked, embedded, and indexed in real time." size="lg">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {(["upload", "youtube"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx("flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all", tab === t ? "bg-panel text-foreground shadow-sm" : "text-muted hover:text-foreground")}
          >
            <Icon name={t === "upload" ? "upload" : "youtube"} className="size-4" />
            {t === "upload" ? "Upload documents" : "YouTube video"}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
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
                      <SourceGlyph type={r.type === "youtube" ? "youtube" : "pdf"} className="size-7 shrink-0" />
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
      ) : (
        <div className="space-y-4">
          <Field label="YouTube URL" hint="The transcript is fetched, chunked with timestamps, and indexed into ChromaDB.">
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" disabled={uploading} />
              <Button onClick={addVideo} disabled={!url.trim() || uploading}>{uploading ? "Processing…" : "Add video"}</Button>
            </div>
          </Field>

          <div className="rounded-xl border border-border bg-surface/60 p-3 text-xs">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setShowManualPaste(!showManualPaste)}>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Icon name="sparkles" className="size-3.5 text-accent" />
                <span>Need 100% Guaranteed Full Subtitles? (Optional Manual Paste)</span>
              </div>
              <button type="button" className="text-muted hover:text-foreground text-[11px] font-medium underline">
                {showManualPaste ? "Hide" : "Paste Transcript"}
              </button>
            </div>

            {showManualPaste && (
              <div className="mt-3 space-y-2">
                <p className="text-muted text-[11px] leading-relaxed">
                  💡 <b>Quick YouTube Copy:</b> In YouTube &rarr; Click <b>... (More)</b> under the video description &rarr; Click <b>"Show transcript"</b> &rarr; Copy &amp; paste text below. DocuMind will index all 200+ verbatim dialogue chunks with second-accurate timestamps!
                </p>
                <textarea
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="0:00 Introduction&#10;0:15 Elon Musk discusses AI...&#10;34:04 Like calculating bank interest..."
                  rows={4}
                  className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
                  disabled={uploading}
                />
              </div>
            )}
          </div>
          {rows.some((r) => r.type === "youtube") && (
            <div className="space-y-2.5">
              <p className="text-[13px] font-medium text-muted">Real-Time Ingestion Pipeline</p>
              {rows.filter((r) => r.type === "youtube").map((r) => (
                <div key={r.id || r.name} className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-3 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <SourceGlyph type="youtube" className="size-7 shrink-0" />
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
          <div className="flex items-start gap-2.5 rounded-lg border border-processing/20 bg-processing-soft px-3.5 py-3 text-[13px] text-processing">
            <Icon name="clock" className="mt-0.5 size-4 shrink-0" />
            Processing time is typically 1-3 seconds. Transcripts are chunked with accurate playback timestamps.
          </div>
        </div>
      )}
    </Modal>
  );
}

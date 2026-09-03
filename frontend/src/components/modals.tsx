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

    // Simulated animated progress stages while backend processes
    const pInterval = setInterval(() => {
      setRows((prev) =>
        prev.map((item) => {
          if (item.status !== "processing") return item;
          if (item.progress < 35) {
            return { ...item, progress: 35, stageText: "Extracting text & pages..." };
          } else if (item.progress < 65) {
            return { ...item, progress: 65, stageText: "Chunking context segments..." };
          } else if (item.progress < 88) {
            return { ...item, progress: 88, stageText: "Indexing dense vectors & ChromaDB..." };
          }
          return item;
        })
      );
    }, 600);

    if (kbId) {
      const token = localStorage.getItem("dm-token") || "";
      const formData = new FormData();
      formData.append("kb_id", kbId);
      fileList.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch(`${API_BASE}/sources/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        clearInterval(pInterval);

        if (res.ok) {
          setRows((prev) =>
            prev.map((item) =>
              fileList.some((f) => f.name === item.name)
                ? { ...item, status: "ready", stageText: "Ready & indexed in ChromaDB", progress: 100 }
                : item
            )
          );
          toast(`Indexed ${files.length} document(s) successfully!`);
          onAdded?.();
        } else {
          const err = await res.json().catch(() => ({}));
          setRows((prev) =>
            prev.map((item) =>
              fileList.some((f) => f.name === item.name)
                ? { ...item, status: "failed", stageText: err.detail || "Upload error", progress: 100 }
                : item
            )
          );
          toast(err.detail || `Upload error: ${res.statusText}`, "error");
        }
      } catch (err: any) {
        clearInterval(pInterval);
        setRows((prev) =>
          prev.map((item) => ({ ...item, status: "failed", stageText: "Network connection error", progress: 100 }))
        );
        toast("Network error during document upload", "error");
      } finally {
        setUploading(false);
      }
    } else {
      setTimeout(() => {
        clearInterval(pInterval);
        setRows((r) => r.map((item) => ({ ...item, status: "ready", stageText: "Ready", progress: 100 })));
        toast(`Uploaded ${files.length} file(s)`);
        setUploading(false);
      }, 800);
    }
  };

async function fetchClientYouTubeCaptions(url: string): Promise<any[] | null> {
  try {
    const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|\/v\/|\/e\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return null;
    const videoId = match[1];

    const proxyUrls = [
      `https://corsproxy.io/?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`,
    ];

    let html = "";
    for (const proxy of proxyUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(proxy, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          html = await res.text();
          if (html.includes("captionTracks")) break;
        }
      } catch {
        continue;
      }
    }

    if (!html) return null;

    const ctMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!ctMatch) return null;

    const tracks = JSON.parse(ctMatch[1]);
    if (!tracks || tracks.length === 0) return null;

    const enTrack = tracks.find((t: any) => (t.languageCode || "").toLowerCase().startsWith("en")) || tracks[0];
    const captionUrl = enTrack.baseUrl;
    if (!captionUrl) return null;

    let xmlText = "";
    // 1. Direct browser fetch (residential IP, fastest)
    try {
      const directRes = await fetch(captionUrl);
      if (directRes.ok) {
        xmlText = await directRes.text();
      }
    } catch {}

    // 2. Fallback to corsproxy.io
    if (!xmlText) {
      try {
        const cpRes = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(captionUrl)}`);
        if (cpRes.ok) {
          xmlText = await cpRes.text();
        }
      } catch {}
    }

    // 3. Fallback to allorigins
    if (!xmlText) {
      try {
        const aoRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(captionUrl)}`);
        if (aoRes.ok) {
          xmlText = await aoRes.text();
        }
      } catch {}
    }

    if (!xmlText) return null;

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const pNodes = xmlDoc.getElementsByTagName("p");
    const textNodes = xmlDoc.getElementsByTagName("text");
    const nodes = pNodes.length > 0 ? pNodes : textNodes;
    if (!nodes || nodes.length === 0) return null;

    const segments: any[] = [];
    let currentBlockText: string[] = [];
    let currentStartSec = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let start = 0;
      if (node.hasAttribute("t")) {
        start = parseFloat(node.getAttribute("t") || "0") / 1000.0;
      } else if (node.hasAttribute("start")) {
        start = parseFloat(node.getAttribute("start") || "0");
      }

      const cleanText = (node.textContent || "")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();

      if (!cleanText) continue;

      if (currentBlockText.length === 0) {
        currentStartSec = start;
      }

      currentBlockText.push(cleanText);

      const accumulated = currentBlockText.join(" ");
      if (accumulated.length >= 350) {
        const mins = Math.floor(currentStartSec / 60);
        const secs = Math.floor(currentStartSec % 60);
        const hours = Math.floor(mins / 60);
        const m = mins % 60;
        const tsStr =
          hours > 0
            ? `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
            : `${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

        segments.push({
          text: accumulated,
          timestamp: tsStr,
          timestamp_seconds: currentStartSec,
          section_name: `Dialogue @ ${tsStr}`,
          url: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(currentStartSec)}s`,
        });
        currentBlockText = [];
      }
    }

    if (currentBlockText.length > 0) {
      const accumulated = currentBlockText.join(" ");
      const mins = Math.floor(currentStartSec / 60);
      const secs = Math.floor(currentStartSec % 60);
      const hours = Math.floor(mins / 60);
      const m = mins % 60;
      const tsStr =
        hours > 0
          ? `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
          : `${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      segments.push({
        text: accumulated,
        timestamp: tsStr,
        timestamp_seconds: currentStartSec,
        section_name: `Dialogue @ ${tsStr}`,
        url: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(currentStartSec)}s`,
      });
    }

    return segments.length > 0 ? segments : null;
  } catch (err) {
    console.warn("Client-side YouTube transcript fetch error:", err);
    return null;
  }
}

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
      stageText: "Fetching official verbatim subtitles...",
      progress: 25,
    };

    setRows((r) => [newRow, ...r]);
    setUrl("");

    const pInterval = setInterval(() => {
      setRows((prev) =>
        prev.map((item) => {
          if (item.id !== rowId || item.status !== "processing") return item;
          if (item.progress < 45) {
            return { ...item, progress: 45, stageText: "Extracting word-for-word dialogue..." };
          } else if (item.progress < 75) {
            return { ...item, progress: 75, stageText: "Chunking second-by-second timestamps..." };
          } else if (item.progress < 90) {
            return { ...item, progress: 90, stageText: "Indexing dense vectors into ChromaDB..." };
          }
          return item;
        })
      );
    }, 700);

    if (kbId) {
      try {
        // Attempt client-side verbatim subtitle extraction
        let clientSegments: any[] | null = null;
        try {
          clientSegments = await fetchClientYouTubeCaptions(currentUrl);
        } catch {
          clientSegments = null;
        }

        const payload: any = { kb_id: kbId, url: currentUrl };
        if (clientSegments && clientSegments.length > 0) {
          payload.client_transcript_segments = clientSegments;
        }

        const res = await fetch(`${API_BASE}/sources/youtube`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        clearInterval(pInterval);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          setRows((prev) =>
            prev.map((item) =>
              item.id === rowId
                ? {
                    ...item,
                    name: data.name || item.name,
                    status: "ready",
                    stageText: `Ready (${data.chunk_count || "All"} verbatim chunks indexed)`,
                    progress: 100,
                  }
                : item
            )
          );
          toast("YouTube video processed and indexed with 100% verbatim dialogue!");
          onAdded?.();
        } else {
          const err = await res.json().catch(() => ({}));
          setRows((prev) =>
            prev.map((item) =>
              item.id === rowId
                ? { ...item, status: "failed", stageText: err.detail || "Failed to process video", progress: 100 }
                : item
            )
          );
          toast(err.detail || "Failed to process YouTube video", "error");
        }
      } catch (err: any) {
        clearInterval(pInterval);
        setRows((prev) =>
          prev.map((item) =>
            item.id === rowId ? { ...item, status: "failed", stageText: "Network error", progress: 100 } : item
          )
        );
        toast("Network error during YouTube processing", "error");
      } finally {
        setUploading(false);
      }
    } else {
      setTimeout(() => {
        clearInterval(pInterval);
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

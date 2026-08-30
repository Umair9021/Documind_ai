import { useState, useEffect } from "react";
import { Button, Field, Icon, Input, Modal, SourceGlyph, StatusBadge, cx, useToast } from "./ui";
import type { SourceStatus } from "../lib/data";

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

  // Sync state when kb or modal open changes
  useEffect(() => {
    if (kb && open) {
      setName(kb.name || "");
      setDesc(kb.description || "");
    }
  }, [kb, open]);

  const submit = async () => {
    if (!kb || !name.trim() || loading) return;
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
      description="Update the name and description of this knowledge base."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || loading}>
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
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

type UploadRow = { name: string; status: SourceStatus };

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
    setRows((r) => [...fileList.map((f) => ({ name: f.name, status: "processing" as SourceStatus })), ...r]);

    if (kbId) {
      const token = localStorage.getItem("dm-token") || "";
      const formData = new FormData();
      formData.append("kb_id", kbId);
      fileList.forEach((f) => formData.append("files", f));

      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/sources/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        toast(`Uploaded ${files.length} document(s)`);
        setRows((r) => r.map((item) => ({ ...item, status: "ready" as SourceStatus })));
        onAdded?.();
      } catch (err: any) {
        toast(`Upload error: ${err.message}`, "error");
        setRows((r) => r.map((item) => ({ ...item, status: "failed" as SourceStatus })));
      } finally {
        setUploading(false);
      }
    } else {
      setTimeout(() => {
        setRows((r) => r.map((item) => ({ ...item, status: "ready" as SourceStatus })));
        toast(`Uploaded ${files.length} file(s)`);
        setUploading(false);
      }, 1000);
    }
  };

  const addVideo = async () => {
    if (!url.trim()) return;
    const currentUrl = url.trim();
    const token = localStorage.getItem("dm-token") || "";
    setUploading(true);
    setRows((r) => [{ name: currentUrl, status: "processing" as SourceStatus }, ...r]);
    setUrl("");

    if (kbId) {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/sources/youtube", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ kb_id: kbId, url: currentUrl }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to index video");
        toast("YouTube video transcript indexed successfully");
        setRows((r) => r.map((item) => item.name === currentUrl ? { ...item, status: "ready" as SourceStatus } : item));
        onAdded?.();
      } catch (err: any) {
        toast(`Error: ${err.message}`, "error");
        setRows((r) => r.map((item) => item.name === currentUrl ? { ...item, status: "failed" as SourceStatus } : item));
      } finally {
        setUploading(false);
      }
    } else {
      toast("Video queued for processing");
      setUploading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add source" description="Documents and YouTube videos are processed and indexed automatically." size="lg">
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
          <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <Icon name="upload" className="mb-3 size-7 text-accent" />
            <p className="text-sm font-medium">Drag & drop files, or <span className="text-accent">browse</span></p>
            <p className="mt-1 text-xs text-muted">PDF, DOCX, TXT, Markdown, CSV, XLSX · 50 MB storage quota per account</p>
          </label>
          {rows.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted">Recent uploads</p>
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  <SourceGlyph type="pdf" className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="YouTube URL" hint="The transcript is fetched and indexed. Videos without captions can't be processed.">
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/watch?v=…" disabled={uploading} />
              <Button onClick={addVideo} disabled={!url.trim() || uploading}>{uploading ? "Indexing…" : "Add video"}</Button>
            </div>
          </Field>
          <div className="flex items-start gap-2.5 rounded-lg border border-processing/20 bg-processing-soft px-3.5 py-3 text-[13px] text-processing">
            <Icon name="clock" className="mt-0.5 size-4 shrink-0" />
            Processing time depends on video length. You can keep working while it indexes.
          </div>
        </div>
      )}
    </Modal>
  );
}

"use client";

import React, { useState } from "react";
import { Button, Field, Icon, Input, Modal, SourceGlyph, StatusBadge, cx, useToast } from "./ui";

export function CreateKBModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      await onCreate(name.trim(), desc.trim());
      setName("");
      setDesc("");
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
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name.trim() || loading}>
            {loading ? "Creating…" : "Create knowledge base"}
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
        <Field label="Description" hint="Optional — helps you and collaborators recognise it later.">
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="What is this knowledge base about?"
            className="w-full resize-none rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </Field>
      </div>
    </Modal>
  );
}

export function AddSourceModal({ open, onClose, kbId, onSourceAdded }) {
  const [tab, setTab] = useState("upload");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recentUploads, setRecentUploads] = useState([]);
  const toast = useToast();

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !kbId) return;

    setUploading(true);
    const newItems = Array.from(files).map((f) => ({ name: f.name, status: "processing" }));
    setRecentUploads((prev) => [...newItems, ...prev]);

    const formData = new FormData();
    formData.append("kb_id", kbId);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/sources/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      toast(`Successfully uploaded ${files.length} document(s)`);
      setRecentUploads((prev) =>
        prev.map((item) =>
          data.some((d) => d.name === item.name) ? { ...item, status: "ready" } : item
        )
      );
      if (onSourceAdded) onSourceAdded();
    } catch (err) {
      toast("Error uploading files: " + err.message, "error");
      setRecentUploads((prev) =>
        prev.map((item) => ({ ...item, status: "failed" }))
      );
    } finally {
      setUploading(false);
    }
  };

  const handleAddYouTube = async () => {
    if (!url.trim() || !kbId || uploading) return;
    setUploading(true);

    const newVideo = { name: url, status: "processing" };
    setRecentUploads((prev) => [newVideo, ...prev]);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/sources/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kb_id: kbId, url: url.trim() }),
      });

      if (!res.ok) throw new Error("Failed to index YouTube video");
      const data = await res.json();
      toast("YouTube video transcript indexed successfully!");
      setUrl("");
      setRecentUploads((prev) =>
        prev.map((item) => (item.name === url ? { name: data.name || url, status: "ready" } : item))
      );
      if (onSourceAdded) onSourceAdded();
    } catch (err) {
      toast("Error indexing YouTube video: " + err.message, "error");
      setRecentUploads((prev) =>
        prev.map((item) => (item.name === url ? { ...item, status: "failed" } : item))
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add source"
      description="Documents and YouTube videos are processed and indexed automatically."
      size="lg"
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
        {["upload", "youtube"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all",
              tab === t
                ? "bg-panel text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            )}
          >
            <Icon name={t === "upload" ? "upload" : "youtube"} className="size-4" />
            <span>{t === "upload" ? "Upload documents" : "YouTube video"}</span>
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div className="space-y-4">
          <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-surface/50 px-6 py-10 text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Icon name="upload" className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              Drag & drop files, or <span className="text-accent hover:underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              PDF, DOCX, TXT, Markdown, CSV, XLSX · up to 250 MB each
            </p>
          </label>

          {recentUploads.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-muted">Recent uploads</p>
              {recentUploads.map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-panel px-3.5 py-2.5">
                  <SourceGlyph type="doc" className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.name}</span>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Field
            label="YouTube URL"
            hint="The transcript is fetched and indexed. Videos without captions can't be processed."
          >
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=…"
                disabled={uploading}
              />
              <Button onClick={handleAddYouTube} disabled={!url.trim() || uploading}>
                {uploading ? "Indexing…" : "Add video"}
              </Button>
            </div>
          </Field>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-[13px] text-amber-600 dark:text-amber-400">
            <Icon name="clock" className="mt-0.5 size-4 shrink-0" />
            <span>Processing time depends on video length. You can keep working while it indexes.</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

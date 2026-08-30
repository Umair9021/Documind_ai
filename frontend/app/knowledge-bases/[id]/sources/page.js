"use client";
import { useState, useEffect } from "react";
import { Plus, Upload, Youtube, FileText, Trash2, CheckCircle2, Clock, AlertCircle, RefreshCw, X, ExternalLink } from "lucide-react";
import { fetchSources, uploadFiles, addYouTubeSource, deleteSource } from "../../../../lib/api";

export default function SourcesPage({ params }) {
  const kbId = params.id;
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showYTModal, setShowYTModal] = useState(false);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");

  useEffect(() => {
    loadSources();
  }, [kbId]);

  async function loadSources() {
    setLoading(true);
    const data = await fetchSources(kbId);
    setSources(data);
    setLoading(false);
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newSources = await uploadFiles(kbId, files);
      setSources((prev) => [...newSources, ...prev]);
    } catch (err) {
      alert("Error uploading documents: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleYouTubeSubmit(e) {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    setYtError("");

    try {
      const newSource = await addYouTubeSource(kbId, ytUrl.trim());
      setSources((prev) => [newSource, ...prev]);
      setYtUrl("");
      setShowYTModal(false);
    } catch (err) {
      setYtError(err.message || "Failed to extract YouTube transcript");
    } finally {
      setYtLoading(false);
    }
  }

  async function handleDeleteSource(sourceId) {
    if (!confirm("Are you sure you want to remove this source and its vector embeddings?")) return;
    await deleteSource(sourceId);
    setSources(sources.filter((s) => s.id !== sourceId));
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Knowledge Sources</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add documents and YouTube videos to expand your Knowledge Base.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex h-9 cursor-pointer items-center space-x-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition">
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? "Processing..." : "Upload Documents"}</span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowYTModal(true)}
            className="flex h-9 items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <Youtube className="h-3.5 w-3.5 text-red-500" />
            <span>Add YouTube URL</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading sources...</div>
      ) : sources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">No sources indexed yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Upload PDF, DOCX, TXT, CSV files or paste YouTube video links to populate this knowledge base.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {sources.map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    {src.source_type === "youtube" ? (
                      <Youtube className="h-4 w-4 text-red-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-sky-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{src.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span className="uppercase font-mono text-[10px]">{src.source_type}</span>
                      <span>•</span>
                      <span>{src.chunk_count || 0} chunks</span>
                      {src.url && (
                        <>
                          <span>•</span>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:underline flex items-center space-x-0.5"
                          >
                            <span>Link</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  {src.status === "ready" ? (
                    <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Ready</span>
                    </span>
                  ) : src.status === "processing" ? (
                    <span className="inline-flex items-center space-x-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 animate-pulse">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Indexing...</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                      <AlertCircle className="h-3 w-3" />
                      <span>Failed</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteSource(src.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                    title="Delete source"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showYTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Youtube className="h-5 w-5 text-red-500" />
                <h3 className="text-base font-bold text-slate-900">Add YouTube Source</h3>
              </div>
              <button
                onClick={() => setShowYTModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Paste any YouTube video URL. DocuMind will automatically extract the closed captions and preserve timestamps for citations.
            </p>

            <form onSubmit={handleYouTubeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">YouTube Video URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>

              {ytError && (
                <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 flex items-start space-x-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{ytError}</span>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowYTModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ytLoading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {ytLoading ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Extracting & Chunking...</span>
                    </>
                  ) : (
                    <span>Add Video</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

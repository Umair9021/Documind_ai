"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SlidersHorizontal, ArrowLeft, Play, Layers, Clock, CheckCircle2, Search } from "lucide-react";
import { fetchKBs, runPlayground } from "../../../lib/api";

export default function PlaygroundPage() {
  const [kbs, setKbs] = useState([]);
  const [selectedKb, setSelectedKb] = useState("");
  const [query, setQuery] = useState("What are the key concepts of vector similarity search?");
  const [strategy, setStrategy] = useState("hybrid_rrf");
  const [topK, setTopK] = useState(4);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchKBs();
      setKbs(data);
      if (data.length > 0) setSelectedKb(data[0].id);
    }
    load();
  }, []);

  async function handleTest(e) {
    e.preventDefault();
    if (!selectedKb || !query.trim()) return;
    setLoading(true);
    const data = await runPlayground(selectedKb, query, strategy, topK);
    setResults(data);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 w-full">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-200">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="inline-flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="h-3 w-3 text-sky-600" />
            <span>Advanced Tools</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">RAG Retrieval Playground</h1>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 mb-6">
        Experiment with different retrieval algorithms in isolation to inspect retrieved chunks and similarity scores.
      </p>

      <form onSubmit={handleTest} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Knowledge Base</label>
            <select
              value={selectedKb}
              onChange={(e) => setSelectedKb(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
            >
              {kbs.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Retrieval Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="hybrid_rrf">Hybrid RRF (Dense + BM25)</option>
              <option value="similarity">Vector Similarity</option>
              <option value="mmr">MMR (Diversity)</option>
              <option value="bm25">BM25 (Exact Keyword)</option>
              <option value="multiquery">Multi-Query Expansion</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Top K Results: {topK}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full mt-2 accent-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Test Query</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter query to test retrieval..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 shrink-0 items-center space-x-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{loading ? "Running..." : "Test"}</span>
            </button>
          </div>
        </div>
      </form>

      {results && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Retrieved Chunks ({results.total_retrieved})
            </h3>
            <div className="flex items-center space-x-3 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{results.execution_time_ms} ms</span>
              </span>
              <span className="uppercase font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {results.strategy}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {results.retrieved_chunks.map((chunk, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                  <span className="font-semibold text-slate-800">
                    [{idx + 1}] {chunk.source_name}
                  </span>
                  <span className="font-mono text-emerald-600 font-bold">
                    Score: {(chunk.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Clock, Eye, Sparkles, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import { fetchKBs, runInspector } from "../../../lib/api";

export default function InspectorPage() {
  const [kbs, setKbs] = useState([]);
  const [selectedKb, setSelectedKb] = useState("");
  const [query, setQuery] = useState("How does RAG eliminate model hallucinations?");
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchKBs();
      setKbs(data);
      if (data.length > 0) setSelectedKb(data[0].id);
    }
    load();
  }, []);

  async function handleInspect(e) {
    e.preventDefault();
    if (!selectedKb || !query.trim()) return;
    setLoading(true);
    const data = await runInspector(selectedKb, query, "hybrid_rrf");
    setTrace(data);
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
            <Eye className="h-3 w-3 text-indigo-600" />
            <span>Advanced Tools</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Retrieval Trace Inspector</h1>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 mb-6">
        Inspect the internal step-by-step lifecycle of query processing, dual-stream retrieval, fusion, context formatting, and prompt assembly.
      </p>

      <form onSubmit={handleInspect} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <select
          value={selectedKb}
          onChange={(e) => setSelectedKb(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none w-full sm:w-60"
        >
          {kbs.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query to inspect..."
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="flex h-9 shrink-0 items-center space-x-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          <Search className="h-3.5 w-3.5" />
          <span>{loading ? "Tracing..." : "Inspect Trace"}</span>
        </button>
      </form>

      {trace && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Pipeline Execution Timeline</h3>
            <span className="text-xs text-slate-400 font-mono">{trace.execution_time_ms} ms total latency</span>
          </div>

          <div className="space-y-4">
            {trace.steps.map((step, idx) => (
              <div key={idx} className="flex space-x-3.5">
                <div className="flex flex-col items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                    {idx + 1}
                  </div>
                  {idx !== trace.steps.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                </div>
                <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm pb-5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{step.step_name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{step.description}</p>
                  <div className="mt-3 max-h-40 overflow-y-auto rounded-lg bg-slate-50 p-2.5 text-[11px] font-mono text-slate-700 leading-relaxed">
                    <pre>{JSON.stringify(step.data, null, 2)}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Assembled Grounded Prompt sent to LLM
            </h4>
            <div className="max-h-60 overflow-y-auto rounded-lg bg-slate-900 p-4 text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {trace.prompt_sent_to_llm || "No prompt trace available."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

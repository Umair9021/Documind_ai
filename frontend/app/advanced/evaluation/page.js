"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, ArrowLeft, Play, Award, CheckCircle2, Clock, Zap } from "lucide-react";
import { fetchKBs, runEvaluation } from "../../../lib/api";

export default function EvaluationPage() {
  const [kbs, setKbs] = useState([]);
  const [selectedKb, setSelectedKb] = useState("");
  const [testQueriesText, setTestQueriesText] = useState(
    "What are the main concepts of RAG?\nCompare BM25 vs Vector Search.\nHow does HNSW navigation work?"
  );
  const [evalResult, setEvalResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchKBs();
      setKbs(data);
      if (data.length > 0) setSelectedKb(data[0].id);
    }
    load();
  }, []);

  async function handleEvaluate(e) {
    e.preventDefault();
    if (!selectedKb) return;
    const queries = testQueriesText
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    setLoading(true);
    const data = await runEvaluation(selectedKb, queries);
    setEvalResult(data);
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
            <BarChart3 className="h-3 w-3 text-emerald-600" />
            <span>Advanced Tools</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">RAG Strategy Evaluator</h1>
        </div>
      </div>

      <p className="text-xs text-slate-500 mt-2 mb-6">
        Empirically benchmark and compare retrieval accuracy, faithfulness, and latency across multiple retrieval algorithms.
      </p>

      <form onSubmit={handleEvaluate} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Select Knowledge Base</label>
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Test Evaluation Queries (One per line)
          </label>
          <textarea
            rows={4}
            value={testQueriesText}
            onChange={(e) => setTestQueriesText(e.target.value)}
            className="w-full rounded-lg border border-slate-200 p-3 text-xs font-mono focus:border-slate-900 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-9 items-center space-x-1.5 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
        >
          <Play className="h-3.5 w-3.5" />
          <span>{loading ? "Running Benchmark..." : "Run Evaluation Benchmark"}</span>
        </button>
      </form>

      {evalResult && (
        <div className="mt-8 space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start space-x-3">
            <Award className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Recommended Strategy: {evalResult.recommended_strategy}
              </h4>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                {evalResult.comparison_summary}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Strategy</th>
                  <th className="py-3 px-4">Relevance Score</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4">Faithfulness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {evalResult.metrics_by_strategy.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold font-sans text-slate-900 flex items-center space-x-1.5">
                      {m.strategy === evalResult.recommended_strategy && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{m.strategy}</span>
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">
                      {(m.avg_relevance_score * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.avg_latency_ms} ms</td>
                    <td className="py-3 px-4 text-indigo-600 font-bold">
                      {(m.faithfulness_score * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

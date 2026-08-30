import { useState } from "react";
import { PageHeader } from "../components/AppShell";
import { Button, Badge, Field, Icon, Input, cx } from "../components/ui";
import { playgroundResults, evaluationRows } from "../lib/data";

const retrievers = ["Similarity Search", "MMR", "MultiQuery", "BM25", "Query Fusion"];

/* ---------------- RAG Playground ---------------- */
export function Playground() {
  const [query, setQuery] = useState("difference between BM25 and vector search");
  const [retriever, setRetriever] = useState("Query Fusion");
  const [topK, setTopK] = useState(4);
  const [ran, setRan] = useState(true);
  const [loading, setLoading] = useState(false);

  const run = () => { setLoading(true); setRan(false); setTimeout(() => { setLoading(false); setRan(true); }, 900); };
  const results = playgroundResults.slice(0, topK);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <PageHeader title="RAG Playground" subtitle="Experiment with retrieval strategies and inspect the results." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Controls */}
        <div className="space-y-4 rounded-2xl border border-border bg-panel p-5 lg:sticky lg:top-6 lg:self-start">
          <Field label="Query"><textarea value={query} onChange={(e) => setQuery(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-border-strong bg-panel px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" /></Field>
          <Field label="Retriever">
            <div className="grid grid-cols-1 gap-1.5">
              {retrievers.map((r) => (
                <button key={r} onClick={() => setRetriever(r)} className={cx("rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors", retriever === r ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:border-border-strong hover:text-foreground")}>{r}</button>
              ))}
            </div>
          </Field>
          <div>
            <div className="flex items-center justify-between"><span className="text-[13px] font-medium">Top K</span><span className="font-mono text-sm text-accent">{topK}</span></div>
            <input type="range" min={1} max={4} value={topK} onChange={(e) => setTopK(Number(e.target.value))} className="mt-2 w-full accent-accent" />
          </div>
          <Field label="Similarity threshold"><Input type="number" defaultValue={0.7} step={0.05} min={0} max={1} /></Field>
          <Field label="Metadata filters" hint="Optional — e.g. source:pdf, page>10"><Input placeholder="key:value" /></Field>
          <Button className="w-full" icon="flask" onClick={run} disabled={loading}>{loading ? "Running retrieval…" : "Run retrieval"}</Button>
        </div>

        {/* Results */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Retrieved chunks</h2>
            {ran && <Badge>{results.length} results · {retriever}</Badge>}
          </div>
          {loading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-surface" />)}</div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="rounded-2xl border border-border bg-panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-md bg-foreground font-mono text-[11px] font-semibold text-background">{i + 1}</span><span className="text-[13px] font-medium">{r.source}</span><Badge>{r.locator}</Badge></div>
                    <div className="flex items-center gap-2 font-mono text-xs"><span className="text-muted">{r.meta}</span><span className="rounded-md bg-accent-soft px-2 py-0.5 font-semibold text-accent">{r.score.toFixed(3)}</span></div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Retrieval Inspector ---------------- */
const pipeline = [
  { title: "Original query", body: "difference between BM25 and vector search", tone: "neutral" },
  { title: "Query processing", body: "3 query variations generated (MultiQuery)", tone: "neutral", list: ["What distinguishes BM25 from dense retrieval?", "BM25 vs vector similarity search comparison", "Sparse keyword vs semantic embedding retrieval"] },
  { title: "Retrieval", body: "Query Fusion · Top K = 4 · threshold 0.70", tone: "neutral" },
  { title: "Retrieved chunks", body: "4 passages from 3 sources", tone: "accent", list: ["Advanced RAG.pdf · p.23 · 0.912", "Course Notes.docx · §BM25 · 0.874", "RAG Introduction.pdf · p.11 · 0.803", "RAG Lecture 01 · 12:40 · 0.771"] },
  { title: "Fusion / ranking", body: "Reciprocal Rank Fusion across lexical + dense rankings", tone: "neutral" },
  { title: "Final context", body: "1,284 tokens assembled · 4 passages deduplicated", tone: "neutral" },
  { title: "LLM", body: "Claude Sonnet 5 · temperature 0.2 · answer generated with 2 citations", tone: "accent" },
];

export function Inspector() {
  const [open, setOpen] = useState<number | null>(1);
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-10">
      <PageHeader title="Retrieval Inspector" subtitle="Trace how a query flows through the RAG pipeline." />
      <div className="mt-8">
        {pipeline.map((step, i) => (
          <div key={i} className="relative pl-10">
            {i < pipeline.length - 1 && <div className="absolute left-[15px] top-8 h-full w-px bg-border-strong" />}
            <div className={cx("absolute left-0 top-1 flex size-8 items-center justify-center rounded-full border font-mono text-xs font-semibold", step.tone === "accent" ? "border-accent bg-accent text-white" : "border-border-strong bg-panel text-muted")}>{i + 1}</div>
            <div className="pb-5">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-left transition-colors hover:border-border-strong">
                <div><p className="text-sm font-semibold">{step.title}</p><p className="mt-0.5 font-mono text-xs text-muted">{step.body}</p></div>
                {step.list && <Icon name="chevron-down" className={cx("size-4 shrink-0 text-faint transition-transform", open === i && "rotate-180")} />}
              </button>
              {step.list && open === i && (
                <ul className="dm-fade mt-2 space-y-1.5 rounded-xl border border-border bg-surface/60 p-3">
                  {step.list.map((l) => <li key={l} className="flex items-center gap-2 font-mono text-[13px] text-muted"><span className="size-1 rounded-full bg-accent" />{l}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Evaluation ---------------- */
function Bar({ v }: { v: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-accent" style={{ width: `${v * 100}%` }} /></div>
      <span className="font-mono text-xs">{v.toFixed(2)}</span>
    </div>
  );
}

export function Evaluation() {
  const best = Math.max(...evaluationRows.map((r) => r.relevance));
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <PageHeader title="RAG Evaluation" subtitle="Compare retrieval strategies across quality and latency." actions={<Button variant="secondary" icon="retry">Re-run evaluation</Button>} />
      <div className="mt-6 flex flex-wrap gap-3">
        <select className="h-10 rounded-lg border border-border-strong bg-panel px-3 text-sm focus:border-accent focus:outline-none"><option>Generative AI Course</option><option>Thesis — Retrieval Systems</option></select>
        <select className="h-10 rounded-lg border border-border-strong bg-panel px-3 text-sm focus:border-accent focus:outline-none"><option>Sample eval set (24 queries)</option></select>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-processing-soft px-3 text-xs font-medium text-processing"><Icon name="clock" className="size-3.5" />Sample data</span>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-panel sm:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-faint">
            <th className="px-5 py-3">Strategy</th><th className="px-5 py-3">Relevance</th><th className="px-5 py-3">Faithfulness</th><th className="px-5 py-3">Citation</th><th className="px-5 py-3 text-right">Latency</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {evaluationRows.map((r) => (
              <tr key={r.strategy} className="hover:bg-surface/60">
                <td className="px-5 py-3.5 font-medium">{r.strategy} {r.relevance === best && <span className="ml-1 rounded-md bg-ready-soft px-1.5 py-0.5 text-[11px] font-semibold text-ready">Best</span>}</td>
                <td className="px-5 py-3.5"><Bar v={r.relevance} /></td>
                <td className="px-5 py-3.5"><Bar v={r.faithfulness} /></td>
                <td className="px-5 py-3.5"><Bar v={r.citation} /></td>
                <td className="px-5 py-3.5 text-right font-mono">{r.latency} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {evaluationRows.map((r) => (
          <div key={r.strategy} className="rounded-2xl border border-border bg-panel p-4">
            <div className="flex items-center justify-between"><p className="font-medium">{r.strategy}</p><span className="font-mono text-xs text-muted">{r.latency} ms</span></div>
            <div className="mt-3 space-y-2">
              {[["Relevance", r.relevance], ["Faithfulness", r.faithfulness], ["Citation", r.citation]].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between"><span className="text-[13px] text-muted">{k}</span><Bar v={v as number} /></div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 font-mono text-xs text-faint">Sample data shown for design purposes. Run an evaluation to populate real metrics.</p>
    </div>
  );
}

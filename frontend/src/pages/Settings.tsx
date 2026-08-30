import { useEffect, useState } from "react";
import { PageHeader } from "../components/AppShell";
import { Button, Field, Icon, Input, Skeleton, cx, useToast } from "../components/ui";
import { API_BASE } from "../lib/supabase";

const tabs = [
  { id: "account", label: "Account", icon: "user" as const },
  { id: "ai", label: "AI Model", icon: "sparkle" as const },
  { id: "retrieval", label: "Retrieval", icon: "search" as const },
  { id: "usage", label: "Usage & Limits", icon: "chart" as const },
] as const;
type Tab = (typeof tabs)[number]["id"];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold text-accent">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-accent cursor-pointer"
      />
      {hint && <p className="mt-1 text-xs text-muted leading-relaxed">{hint}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-panel p-4 sm:p-6 shadow-xs">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-5">{children}</div>
    </div>
  );
}

export function Settings() {
  const [tab, setTab] = useState<Tab>("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Account state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // AI state
  const [model, setModel] = useState("llama-3.3-70b-versatile");
  const [temp, setTemp] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(1024);

  // Retrieval state
  const [strategy, setStrategy] = useState("hybrid_rrf");
  const [topK, setTopK] = useState(6);
  const [threshold, setThreshold] = useState(0.75);

  // Usage state
  const [usage, setUsage] = useState<any>(null);

  // Load live settings & profile from database
  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("dm-token") || "";
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [pRes, sRes, uRes] = await Promise.all([
          fetch(`${API_BASE}/settings/profile`, { headers }),
          fetch(`${API_BASE}/settings/`, { headers }),
          fetch(`${API_BASE}/settings/usage`, { headers }),
        ]);

        if (pRes.ok) {
          const profile = await pRes.json();
          setFullName(profile.full_name || "Scholar");
          setEmail(profile.email || "user@documind.ai");
        }

        if (sRes.ok) {
          const settings = await sRes.json();
          if (settings.llm_model) setModel(settings.llm_model);
          if (settings.temperature !== undefined) setTemp(settings.temperature);
          if (settings.max_tokens !== undefined) setMaxTokens(settings.max_tokens);
          if (settings.default_strategy) setStrategy(settings.default_strategy);
          if (settings.top_k !== undefined) setTopK(settings.top_k);
          if (settings.similarity_threshold !== undefined) setThreshold(settings.similarity_threshold);
        }

        if (uRes.ok) {
          const usageData = await uRes.json();
          setUsage(usageData);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const saveAccount = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          ...(password ? { password } : {}),
        }),
      });
      if (res.ok) {
        toast("Account profile updated successfully");
        setPassword("");
      }
    } catch (e) {
      toast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveAISettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_model: model,
          temperature: temp,
          max_tokens: maxTokens,
        }),
      });
      if (res.ok) {
        toast("AI Model settings saved successfully");
      }
    } catch (e) {
      toast("Failed to save AI settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveRetrievalSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_strategy: strategy,
          top_k: topK,
          similarity_threshold: threshold,
        }),
      });
      if (res.ok) {
        toast("Retrieval settings saved successfully");
      }
    } catch (e) {
      toast("Failed to save retrieval settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl px-4 py-5 sm:px-8 sm:py-8">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, real-time database AI configuration, and workspace limits."
      />

      <div className="mt-5 sm:mt-6 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              "-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
              tab === t.id
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            <Icon name={t.icon} className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-6">
        {tab === "account" && (
          <Card title="Account Profile">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full Name">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aditi Rao"
                    />
                  </Field>
                  <Field label="Email Address">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. aditi@research.edu"
                    />
                  </Field>
                </div>
                <Field label="Change Password" hint="Leave blank to keep your existing password.">
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button onClick={saveAccount} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {tab === "ai" && (
          <Card title="AI Model Configuration">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                <Field label="Language Model (LLM)" hint="The foundational model used to generate source-grounded answers.">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border-strong bg-panel px-3.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                  >
                    <option value="llama-3.3-70b-versatile">Groq — Llama 3.3 70B Versatile (Ultra Fast, High Accuracy)</option>
                    <option value="llama-3.1-8b-instant">Groq — Llama 3.1 8B Instant (Lightweight)</option>
                    <option value="ibm/granite-3-8b-instruct">IBM Watsonx — Granite 3.1 8B Instruct</option>
                    <option value="gpt-4o-mini">OpenAI — GPT-4o Mini</option>
                    <option value="mistral">Ollama — Mistral 7B (Local Offline)</option>
                  </select>
                </Field>
                <Slider
                  label="Temperature"
                  value={temp}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setTemp}
                  hint="Lower temperature (0.1–0.3) is more factual and strict with source citations; higher temperature is more creative."
                />
                <Slider
                  label="Max Tokens"
                  value={maxTokens}
                  min={256}
                  max={4096}
                  step={128}
                  onChange={setMaxTokens}
                  hint="Maximum response length generated per answer."
                />
                <div className="flex justify-end">
                  <Button onClick={saveAISettings} disabled={saving}>
                    {saving ? "Saving…" : "Save AI settings"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {tab === "retrieval" && (
          <Card title="Retrieval Strategy & Parameters">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                <Field label="Default Retrieval Pipeline" hint="The algorithm used to find the most relevant chunks from your documents & video transcripts.">
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border-strong bg-panel px-3.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 cursor-pointer"
                  >
                    <option value="hybrid_rrf">Hybrid RRF (Dense Vector + BM25 with Reciprocal Rank Fusion - Recommended)</option>
                    <option value="vector_similarity">Dense Vector Search (FAISS HNSW Embeddings)</option>
                    <option value="bm25">BM25 Keyword Search (Exact lexical term matching)</option>
                    <option value="multi_query">Multi-Query Expansion (Generates 3 query variations)</option>
                    <option value="rerank_cross_encoder">Cross-Encoder Re-ranking (ms-marco-MiniLM-L-6-v2)</option>
                  </select>
                </Field>
                <Slider
                  label="Top K Passages"
                  value={topK}
                  min={1}
                  max={20}
                  step={1}
                  onChange={setTopK}
                  hint="Number of source chunks retrieved and injected into the LLM context."
                />
                <Slider
                  label="Similarity Threshold"
                  value={threshold}
                  min={0}
                  max={1}
                  step={0.05}
                  onChange={setThreshold}
                  hint="Minimum relevance score threshold for a chunk to be cited in the answer."
                />
                <div className="flex justify-end">
                  <Button onClick={saveRetrievalSettings} disabled={saving}>
                    {saving ? "Saving…" : "Save retrieval settings"}
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {tab === "usage" && (
          <div className="space-y-6">
            <Card title="Database Real-Time Resource Usage">
              {loading || !usage ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      label: "Knowledge bases",
                      value: usage.knowledge_bases ?? 1,
                      cap: `/ ${usage.max_knowledge_bases ?? 5} KBs`,
                      icon: "library" as const,
                      pct: Math.round(((usage.knowledge_bases ?? 1) / (usage.max_knowledge_bases ?? 5)) * 100),
                    },
                    {
                      label: "Documents indexed",
                      value: usage.documents ?? 0,
                      cap: `/ ${usage.max_documents ?? 50} docs`,
                      icon: "sources" as const,
                      pct: Math.round(((usage.documents ?? 0) / (usage.max_documents ?? 50)) * 100),
                    },
                    {
                      label: "Storage quota (Free Tier)",
                      value: `${usage.storage_mb ?? 0} MB`,
                      cap: `/ ${usage.max_storage_mb ?? 50} MB (${usage.storage_percent ?? 0}%)`,
                      icon: "layers" as const,
                      pct: usage.storage_percent ?? 0,
                    },
                    {
                      label: "YouTube videos indexed",
                      value: usage.youtube_videos ?? 0,
                      cap: `/ ${usage.max_youtube_videos ?? 20} videos`,
                      icon: "youtube" as const,
                      pct: Math.round(((usage.youtube_videos ?? 0) / (usage.max_youtube_videos ?? 20)) * 100),
                    },
                  ].map((u) => (
                    <div
                      key={u.label}
                      className="rounded-2xl border border-border bg-panel p-5 shadow-xs"
                    >
                      <div className="flex items-center gap-2 text-muted">
                        <Icon name={u.icon} className="size-4" />
                        <span className="text-[13px]">{u.label}</span>
                      </div>
                      <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                        {u.value}{" "}
                        <span className="text-sm font-normal text-faint">{u.cap}</span>
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${Math.max(u.pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

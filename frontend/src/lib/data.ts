export type SourceStatus = "ready" | "processing" | "pending" | "failed";
export type SourceType = "pdf" | "docx" | "txt" | "md" | "csv" | "xlsx" | "youtube";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  added: string;
  meta: string;
  pages?: number;
  chunks?: number;
  duration?: string;
  url?: string;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  sources: Source[];
  updated: string;
}

export interface Citation {
  source: string;
  type: SourceType;
  locator: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  state?: "ok" | "no-info" | "error";
  streaming?: boolean;
}

export const knowledgeBases: KnowledgeBase[] = [];
export const sampleConversation: ChatMessage[] = [];

export const playgroundResults = [
  { source: "docuemnt reading after lab of FAISS.pdf", locator: "p.2", score: 0.912, meta: "chunk 214 · sparse+dense", text: "BM25 remains a strong sparse baseline; term-frequency weighting rewards exact keyword matches while penalising over-long documents." },
  { source: "Study plan.pdf", locator: "p.1", score: 0.874, meta: "chunk 44 · dense", text: "Dense retrieval embeds query and passage into a shared vector space and ranks candidates by cosine similarity." },
  { source: "Umair CV.pdf", locator: "p.1", score: 0.803, meta: "chunk 86 · dense", text: "Retrieval-augmented generation grounds a language model in retrieved context to reduce hallucination." },
  { source: "Escape 2120 | Full Movie", locator: "12:40", score: 0.771, meta: "transcript · dense", text: "The intuition behind hybrid search is that lexical and semantic signals fail on different queries." },
];

export const evaluationRows = [
  { strategy: "Hybrid RRF", relevance: 0.92, faithfulness: 0.94, citation: 0.91, latency: 120 },
  { strategy: "Similarity", relevance: 0.78, faithfulness: 0.81, citation: 0.74, latency: 210 },
  { strategy: "MMR", relevance: 0.82, faithfulness: 0.84, citation: 0.79, latency: 260 },
  { strategy: "MultiQuery", relevance: 0.86, faithfulness: 0.85, citation: 0.83, latency: 430 },
  { strategy: "BM25", relevance: 0.71, faithfulness: 0.79, citation: 0.77, latency: 90 },
];

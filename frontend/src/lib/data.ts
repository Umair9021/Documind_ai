export type SourceStatus = "ready" | "processing" | "pending" | "failed";
export type SourceType = "pdf" | "docx" | "txt" | "md" | "csv" | "xlsx";

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  added: string;
  meta: string;
  pages?: number;
  chunks?: number;
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

export const playgroundResults: Array<{ source: string; locator: string; score: number; meta: string; text: string }> = [];

export const evaluationRows = [
  { strategy: "Hybrid RRF", relevance: 0.92, faithfulness: 0.94, citation: 0.91, latency: 120 },
  { strategy: "Similarity", relevance: 0.78, faithfulness: 0.81, citation: 0.74, latency: 210 },
  { strategy: "MMR", relevance: 0.82, faithfulness: 0.84, citation: 0.79, latency: 260 },
  { strategy: "MultiQuery", relevance: 0.86, faithfulness: 0.85, citation: 0.83, latency: 430 },
  { strategy: "BM25", relevance: 0.71, faithfulness: 0.79, citation: 0.77, latency: 90 },
];

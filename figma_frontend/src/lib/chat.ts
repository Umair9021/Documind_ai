import { useSyncExternalStore } from "react";
import type { ChatMessage } from "./data";

export interface Conversation {
  id: string;
  kbId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "dm-conversations";

function load(): Conversation[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as Conversation[];
    // never restore a mid-stream flag
    return raw.map((c) => ({ ...c, messages: c.messages.map((m) => ({ ...m, streaming: false })) }));
  } catch {
    return [];
  }
}

let store: Conversation[] = load();
const listeners = new Set<() => void>();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota / disabled — keep in-memory */ }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Stable snapshot — reference changes only when the store is mutated. */
export function useConversationStore(): Conversation[] {
  return useSyncExternalStore(subscribe, () => store, () => store);
}

export function getConversation(id: string): Conversation | undefined {
  return store.find((c) => c.id === id);
}

export function createConversation(kbId: string, title = "New chat"): Conversation {
  const now = Date.now();
  const conv: Conversation = { id: `c${now}${Math.floor(Math.random() * 1000)}`, kbId, title, messages: [], createdAt: now, updatedAt: now };
  store = [conv, ...store];
  persist();
  return conv;
}

export function updateConversation(id: string, patch: Partial<Omit<Conversation, "id" | "kbId" | "createdAt">>) {
  store = store.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c));
  persist();
}

export function deleteConversation(id: string) {
  store = store.filter((c) => c.id !== id);
  persist();
}

export function restoreConversation(conv: Conversation) {
  if (store.some((c) => c.id === conv.id)) return;
  store = [conv, ...store].sort((a, b) => b.updatedAt - a.updatedAt);
  persist();
}

export function titleFrom(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

export function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 45) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

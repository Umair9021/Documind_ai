import re
import math
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import numpy as np

try:
    from backend.services.vector_store import VectorStoreManager
except ModuleNotFoundError:
    from services.vector_store import VectorStoreManager

class BM25Index:
    """In-memory BM25 index with term frequency saturation (k1=1.2) and document length normalization (b=0.75)"""
    def __init__(self, chunks: List[Dict[str, Any]], k1: float = 1.2, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks = chunks
        self.doc_len = []
        self.avg_doc_len = 0.0
        self.doc_freqs = defaultdict(int)
        self.term_freqs = []
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r'\b\w+\b', text.lower())

    def _build_index(self):
        if not self.chunks:
            return
        total_len = 0
        for chunk in self.chunks:
            tokens = self._tokenize(chunk["content"])
            t_len = len(tokens)
            self.doc_len.append(t_len)
            total_len += t_len

            tf = defaultdict(int)
            for token in tokens:
                tf[token] += 1
            self.term_freqs.append(tf)

            for token in set(tokens):
                self.doc_freqs[token] += 1

        self.avg_doc_len = total_len / len(self.chunks) if self.chunks else 1.0

    def search(self, query: str, top_k: int = 4, target_sources: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        if not self.chunks:
            return []
        query_tokens = self._tokenize(query)
        N = len(self.chunks)
        scores = []

        for idx, chunk in enumerate(self.chunks):
            chunk_src = chunk.get("metadata", {}).get("source_name", "")
            if target_sources and chunk_src not in target_sources:
                continue

            score = 0.0
            doc_len = self.doc_len[idx]

            for q in query_tokens:
                if q not in self.doc_freqs:
                    continue
                df = self.doc_freqs[q]
                idf = math.log(1.0 + (N - df + 0.5) / (df + 0.5))
                tf = self.term_freqs[idx].get(q, 0)
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                tf_score = (tf * (self.k1 + 1.0)) / denom if denom > 0 else 0
                score += idf * tf_score

            scores.append((score, chunk))

        scores.sort(key=lambda x: x[0], reverse=True)
        max_score = scores[0][0] if scores and scores[0][0] > 0 else 1.0
        results = []
        for s, c in scores[:top_k]:
            c_copy = dict(c)
            c_copy["score"] = round(min(1.0, s / max_score), 4) if max_score > 0 else 0.5
            results.append(c_copy)
        return results

class RetrieverFactory:
    """Production-grade modular retrieval engine with hybrid fusion, broad overview sampling, and entity-specific deep-dive routing"""

    def __init__(self):
        self.vector_store = VectorStoreManager()

    def _detect_target_sources(self, kb_id: str, query: str) -> List[str]:
        all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
        if not all_chunks:
            return []

        distinct_sources = list(set([
            c.get("metadata", {}).get("source_name")
            for c in all_chunks if c.get("metadata", {}).get("source_name")
        ]))

        matched_sources = []
        q_clean = query.lower()

        for src in distinct_sources:
            src_clean = src.lower()
            name_no_ext = re.sub(r'\.(pdf|docx|txt|csv|xlsx|json|md)$', '', src_clean).strip()

            # 1. Exact full file name match or full base title match
            if (len(src_clean) >= 4 and src_clean in q_clean) or (len(name_no_ext) >= 5 and name_no_ext in q_clean):
                if src not in matched_sources:
                    matched_sources.append(src)
                continue

            # 2. Explicit citation query (e.g. "in physics_notes", "from file X")
            if len(name_no_ext) >= 4:
                pattern = r'\b(?:in|from|according to|about|of)\s+["\']?' + re.escape(name_no_ext) + r'["\']?\b'
                if re.search(pattern, q_clean):
                    if src not in matched_sources:
                        matched_sources.append(src)

        return matched_sources

    def retrieve_single_source_overview(self, kb_id: str, source_name: str, top_k: int = 6) -> List[Dict[str, Any]]:
        all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
        src_chunks = [c for c in all_chunks if c.get("metadata", {}).get("source_name") == source_name]
        if not src_chunks:
            return []

        sorted_chunks = sorted(src_chunks, key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
        if len(sorted_chunks) <= top_k:
            return sorted_chunks

        step = max(1, len(sorted_chunks) // top_k)
        sampled = []
        for i in range(0, len(sorted_chunks), step):
            if len(sampled) < top_k:
                sampled.append(sorted_chunks[i])
        return sampled

    def retrieve_multi_source_balanced(self, kb_id: str, query: str, target_sources: List[str], top_k_per_source: int = 3) -> List[Dict[str, Any]]:
        all_results = []
        for src in target_sources:
            src_results = self.vector_store.similarity_search(
                kb_id=kb_id,
                query=query,
                top_k=top_k_per_source,
                filters={"source_name": src}
            )
            if len(src_results) < 2:
                all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
                fallback_chunks = [c for c in all_chunks if c.get("metadata", {}).get("source_name") == src]
                sorted_fallback = sorted(fallback_chunks, key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
                for fb in sorted_fallback[:top_k_per_source]:
                    if fb["id"] not in [r["id"] for r in src_results]:
                        fb_copy = dict(fb)
                        fb_copy["score"] = 0.90
                        src_results.append(fb_copy)

            all_results.extend(src_results[:top_k_per_source])
        return all_results

    def retrieve_all_sources_summary(self, kb_id: str) -> List[Dict[str, Any]]:
        all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
        if not all_chunks:
            return []

        chunks_by_source = defaultdict(list)
        for c in all_chunks:
            sname = c.get("metadata", {}).get("source_name", "Unknown")
            chunks_by_source[sname].append(c)

        summary_chunks = []
        for sname, src_chunks in chunks_by_source.items():
            sorted_chunks = sorted(src_chunks, key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
            for sc in sorted_chunks[:2]:
                sc_copy = dict(sc)
                sc_copy["score"] = 0.95
                summary_chunks.append(sc_copy)

        return summary_chunks

    def retrieve(
        self,
        kb_id: str,
        query: str,
        strategy: str = "hybrid_rrf",
        top_k: int = 6,
        similarity_threshold: float = 0.0,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        trace_steps = []
        strategy = strategy.lower()

        # Step 1: Detect matching sources mentioned in query
        target_sources = self._detect_target_sources(kb_id, query)
        q_norm = query.lower().strip()

        is_pure_overview_query = any(k in q_norm for k in [
            "summarize this", "summary of this", "what is this video about", "what is this document about",
            "explain this video", "explain this document", "overview of this video", "overview of this document"
        ]) and not any(t in q_norm for t in ["otter", "owl", "pike", "hnsw", "parameter", "detail", "details", "chapter", "specifically", "how does"])

        trace_steps.append({
            "step_name": "Query Intake & Source Detection",
            "description": f"Query: '{query}'" + (f" (Detected target sources: {target_sources})" if target_sources else ""),
            "data": {"query": query, "strategy": strategy, "target_sources": target_sources}
        })

        # Step 2: Multi-source mentioned
        if len(target_sources) > 1:
            results = self.retrieve_multi_source_balanced(kb_id, query, target_sources, top_k_per_source=max(3, top_k // len(target_sources)))
            trace_steps.append({
                "step_name": "Multi-Document Parallel Retrieval",
                "description": f"Retrieved balanced chunks across {len(target_sources)} mentioned sources: {target_sources}",
                "data": results
            })
            return results, {"steps": trace_steps, "strategy": "multi_source_parallel", "target_sources": target_sources}

        # Step 3: Single source document pure overview query
        if len(target_sources) == 1 and is_pure_overview_query:
            results = self.retrieve_single_source_overview(kb_id, target_sources[0], top_k=top_k)
            trace_steps.append({
                "step_name": "Document Broad Overview Sampling",
                "description": f"Gathered broad representative excerpts from '{target_sources[0]}'",
                "data": results
            })
            return results, {"steps": trace_steps, "strategy": "single_source_overview", "target_sources": target_sources}

        # Step 4: Single source specific topic query -> filter retrieval strictly to that source
        if len(target_sources) == 1:
            filters = filters or {}
            filters["source_name"] = target_sources[0]

        # Step 5: Global summary query check
        is_summary_query = any(k in q_norm for k in [
            "summarize", "summary", "overview", "what is this", "tell me about", "brief",
            "explain the", "explain this", "what happens in", "key points", "main points",
            "takeaways", "video about", "document about", "lecture about", "what is in this",
            "all document", "all files", "what documents", "youtube video", "video"
        ])

        if is_summary_query and not target_sources:
            results = self.retrieve_all_sources_summary(kb_id)
            if results:
                trace_steps.append({
                    "step_name": "Multi-Document Balanced Retrieval",
                    "description": f"Gathered representative overview chunks across {len(results)} sources.",
                    "data": results
                })
                return results, {"steps": trace_steps, "strategy": "multi_source_summary", "is_global_summary": True}

        # Step 6: Targeted Search by chosen strategy
        if strategy == "similarity":
            results = self.vector_store.similarity_search(kb_id, query, top_k=top_k, filters=filters)
            trace_steps.append({
                "step_name": "Vector Similarity Search",
                "description": f"Dense semantic embedding search with cosine similarity (top_k={top_k}).",
                "data": results
            })
        elif strategy == "bm25":
            results = self._bm25_search(kb_id, query, top_k=top_k, target_sources=target_sources)
            trace_steps.append({
                "step_name": "BM25 Keyword Search",
                "description": f"Sparse probabilistic term matching with TF-IDF saturation (top_k={top_k}).",
                "data": results
            })
        elif strategy == "mmr":
            results = self._mmr_search(kb_id, query, top_k=top_k, filters=filters, target_sources=target_sources)
            trace_steps.append({
                "step_name": "Maximal Marginal Relevance (MMR)",
                "description": f"Relevance-diversity balance optimization (lambda=0.7, top_k={top_k}).",
                "data": results
            })
        elif strategy == "multiquery":
            results, variations = self._multiquery_search(kb_id, query, top_k=top_k, filters=filters)
            trace_steps.append({
                "step_name": "Multi-Query Expansion",
                "description": f"Generated query variations: {variations}",
                "data": results
            })
        else:
            # Default: Hybrid RRF
            results, fusion_data = self._hybrid_rrf_search(kb_id, query, top_k=top_k, filters=filters, target_sources=target_sources)
            trace_steps.append({
                "step_name": "Hybrid RRF (Dense + Sparse)",
                "description": f"Reciprocal Rank Fusion across Dense Vector and BM25 Sparse ranks (k=60, top_k={top_k}).",
                "data": fusion_data
            })

        # Apply similarity threshold
        filtered_results = [r for r in results if r.get("score", 1.0) >= similarity_threshold]
        if not filtered_results and results:
            filtered_results = results[:top_k]

        # Resilient Overview Fallback: If 0 chunks matched, fetch broad chunks from available sources
        if not filtered_results:
            fallback = self.retrieve_all_sources_summary(kb_id)
            if fallback:
                filtered_results = fallback
                trace_steps.append({
                    "step_name": "Resilient Overview Fallback",
                    "description": f"Specific search yielded 0 matches; retrieved {len(filtered_results)} representative source chunks for grounding.",
                    "data": filtered_results
                })

        trace_steps.append({
            "step_name": "Final Ranked Chunks",
            "description": f"Selected {len(filtered_results)} chunks for LLM grounding context.",
            "data": filtered_results
        })

        return filtered_results, {"steps": trace_steps, "strategy": strategy}

    def _mmr_search(self, kb_id: str, query: str, top_k: int, filters: Optional[Dict[str, Any]], target_sources: Optional[List[str]] = None, lambda_mult: float = 0.7) -> List[Dict[str, Any]]:
        candidates = self.vector_store.similarity_search(kb_id, query, top_k=top_k * 3, filters=filters)
        if not candidates:
            return []

        selected = [candidates[0]]
        candidates = candidates[1:]

        while len(selected) < top_k and candidates:
            best_idx = 0
            best_mmr = -float("inf")

            for i, cand in enumerate(candidates):
                rel_score = cand.get("score", 0.5)
                cand_tokens = set(re.findall(r'\w+', cand["content"].lower()))
                max_sim_to_selected = 0.0
                for sel in selected:
                    sel_tokens = set(re.findall(r'\w+', sel["content"].lower()))
                    intersection = len(cand_tokens & sel_tokens)
                    union = len(cand_tokens | sel_tokens) or 1
                    sim = intersection / union
                    if sim > max_sim_to_selected:
                        max_sim_to_selected = sim

                mmr_score = lambda_mult * rel_score - (1 - lambda_mult) * max_sim_to_selected
                if mmr_score > best_mmr:
                    best_mmr = mmr_score
                    best_idx = i

            selected.append(candidates.pop(best_idx))

        return selected

    def _bm25_search(self, kb_id: str, query: str, top_k: int, target_sources: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
        if not all_chunks:
            return []
        index = BM25Index(all_chunks)
        return index.search(query, top_k=top_k, target_sources=target_sources)

    def _multiquery_search(self, kb_id: str, query: str, top_k: int, filters: Optional[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
        variations = [
            query,
            f"key concepts and details about {query}",
            f"how does {query} work in practice",
        ]
        
        all_results = {}
        for var in variations:
            res = self.vector_store.similarity_search(kb_id, var, top_k=top_k, filters=filters)
            for r in res:
                cid = r["id"]
                if cid not in all_results or r["score"] > all_results[cid]["score"]:
                    all_results[cid] = r

        sorted_res = sorted(all_results.values(), key=lambda x: x["score"], reverse=True)
        return sorted_res[:top_k], variations

    def _hybrid_rrf_search(self, kb_id: str, query: str, top_k: int, filters: Optional[Dict[str, Any]], target_sources: Optional[List[str]] = None) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        vector_results = self.vector_store.similarity_search(kb_id, query, top_k=top_k * 2, filters=filters)
        
        all_chunks = self.vector_store.get_all_kb_chunks(kb_id)
        bm25_index = BM25Index(all_chunks)
        bm25_results = bm25_index.search(query, top_k=top_k * 2, target_sources=target_sources)

        k_const = 60.0
        rrf_scores = defaultdict(float)
        chunk_map = {}

        for rank, r in enumerate(vector_results, 1):
            cid = r["id"]
            chunk_map[cid] = r
            rrf_scores[cid] += 1.0 / (rank + k_const)

        for rank, r in enumerate(bm25_results, 1):
            cid = r["id"]
            if cid not in chunk_map:
                chunk_map[cid] = r
            rrf_scores[cid] += 1.0 / (rank + k_const)

        sorted_cids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
        
        max_rrf = (2.0 / (1.0 + k_const))
        final_results = []
        for cid in sorted_cids[:top_k]:
            item = dict(chunk_map[cid])
            norm_score = min(1.0, rrf_scores[cid] / max_rrf)
            item["score"] = round(norm_score, 4)
            final_results.append(item)

        fusion_data = {
            "vector_results": vector_results[:top_k],
            "bm25_results": bm25_results[:top_k]
        }
        return final_results, fusion_data

import os
import re
import json
import urllib.request
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import chromadb
from chromadb.config import Settings
from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

try:
    from backend.config import CHROMA_DIR, DEFAULT_EMBEDDING_MODEL, HF_TOKEN, OPENROUTER_API_KEY, OPENROUTER_EMBEDDING_MODEL
except ModuleNotFoundError:
    from config import CHROMA_DIR, DEFAULT_EMBEDDING_MODEL
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_EMBEDDING_MODEL = os.getenv("OPENROUTER_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b:free")

class OpenRouterNemotronEmbeddingFunction(EmbeddingFunction[Documents]):
    """Enterprise Cloud GPU: Computes 2048-dimensional dense embeddings via NVIDIA Nemotron 3 Embed 1B on OpenRouter"""
    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        self.api_key = api_key or OPENROUTER_API_KEY
        self.model_name = model_name or OPENROUTER_EMBEDDING_MODEL
        self.api_url = "https://openrouter.ai/api/v1/embeddings"

    def name(self) -> str:
        return "openrouter_nemotron_embed"

    def _fallback_embed(self, input_texts: List[str]) -> List[List[float]]:
        import hashlib
        import math
        embeddings = []
        for text in input_texts:
            vec = [0.0] * 2048
            words = re.findall(r'\b\w+\b', text.lower()) if text else []
            if not words:
                embeddings.append(vec)
                continue
            for w in words:
                h = int(hashlib.md5(w.encode('utf-8')).hexdigest(), 16) % 2048
                vec[h] += 1.0
            norm = math.sqrt(sum(x * x for x in vec)) or 1.0
            embeddings.append([x / norm for x in vec])
        return embeddings

    def __call__(self, input: Documents) -> Embeddings:
        if not input:
            return []
        
        texts = list(input)
        if not self.api_key:
            return self._fallback_embed(texts)

        # Batch in chunks of 20 to avoid payload size limits
        batch_size = 20
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            payload = {
                "model": self.model_name,
                "input": batch
            }
            req = urllib.request.Request(
                self.api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://documind-ai.com",
                    "X-Title": "DocuMind AI"
                },
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    items = data.get("data", [])
                    if len(items) == len(batch):
                        all_embeddings.extend([item["embedding"] for item in items])
                        continue
            except Exception as e:
                print(f"[OpenRouter Nemotron Embeddings Error] {e}")
            
            # If API call fails or times out, fallback gracefully for this batch
            all_embeddings.extend(self._fallback_embed(batch))

        return all_embeddings

class VectorStoreManager:
    """Manages Chroma DB vector collections isolated per Knowledge Base with NVIDIA Nemotron 1B Cloud GPU Inference"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VectorStoreManager, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=Settings(anonymized_telemetry=False, is_persistent=True)
        )
        self.embedding_fn = OpenRouterNemotronEmbeddingFunction()

    def get_collection(self, kb_id: str):
        collection_name = f"kb_{kb_id.replace('-', '_')}"
        return self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_fn,
            metadata={"kb_id": kb_id, "hnsw:space": "cosine"}
        )

    def add_chunks(self, kb_id: str, chunks: List[Dict[str, Any]]):
        if not chunks:
            return

        collection = self.get_collection(kb_id)
        
        ids = [c["id"] for c in chunks]
        documents = [c["content"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def delete_source_chunks(self, kb_id: str, source_id: str):
        collection = self.get_collection(kb_id)
        try:
            collection.delete(where={"source_id": source_id})
        except Exception:
            pass

    def delete_kb_collection(self, kb_id: str):
        collection_name = f"kb_{kb_id.replace('-', '_')}"
        try:
            self.client.delete_collection(name=collection_name)
        except Exception:
            pass

    def query(
        self,
        kb_id: str,
        query_text: str,
        n_results: int = 6,
        where: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        collection = self.get_collection(kb_id)
        if collection.count() == 0:
            return []

        actual_n = min(n_results, collection.count())
        
        results = collection.query(
            query_texts=[query_text],
            n_results=actual_n,
            where=where,
            include=["documents", "metadatas", "distances"]
        )

        formatted_results = []
        if results and results.get("ids") and results["ids"][0]:
            ids = results["ids"][0]
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            distances = results["distances"][0]

            for i in range(len(ids)):
                dist = distances[i] if distances else 0.0
                score = 1.0 - dist if dist <= 1.0 else 1.0 / (1.0 + dist)
                formatted_results.append({
                    "id": ids[i],
                    "content": docs[i],
                    "metadata": metas[i],
                    "score": float(score),
                    "distance": float(dist)
                })

        return formatted_results

    def similarity_search(
        self,
        kb_id: str,
        query: str,
        top_k: int = 6,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        return self.query(kb_id=kb_id, query_text=query, n_results=top_k, where=filters)

    def get_all_kb_chunks(self, kb_id: str) -> List[Dict[str, Any]]:
        collection = self.get_collection(kb_id)
        if collection.count() == 0:
            return []
        
        try:
            results = collection.get(
                include=["documents", "metadatas"]
            )
            chunks = []
            if results and results.get("ids"):
                ids = results["ids"]
                docs = results.get("documents", [])
                metas = results.get("metadatas", [])
                for i in range(len(ids)):
                    chunks.append({
                        "id": ids[i],
                        "content": docs[i] if i < len(docs) else "",
                        "metadata": metas[i] if i < len(metas) else {}
                    })
            return chunks
        except Exception:
            return []

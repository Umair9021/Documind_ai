import uuid
from typing import List, Dict, Any

# Multi-version LangChain text splitter with resilient pure-Python fallback
try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        class RecursiveCharacterTextSplitter:
            def __init__(self, chunk_size=500, chunk_overlap=50, separators=None):
                self.chunk_size = chunk_size
                self.chunk_overlap = chunk_overlap

            def split_text(self, text: str) -> List[str]:
                if not text:
                    return []
                if len(text) <= self.chunk_size:
                    return [text]
                chunks = []
                start = 0
                step = max(1, self.chunk_size - self.chunk_overlap)
                while start < len(text):
                    end = min(len(text), start + self.chunk_size)
                    chunks.append(text[start:end])
                    if end == len(text):
                        break
                    start += step
                return chunks

try:
    from backend.config import DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP
except ModuleNotFoundError:
    from config import DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP

class TextChunker:
    """Chunks segmented documents and enriches each chunk with source & location metadata"""

    def __init__(self, chunk_size: int = DEFAULT_CHUNK_SIZE, chunk_overlap: int = DEFAULT_CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        try:
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]
            )
        except Exception:
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap
            )

    def chunk_segments(self, segments: List[Dict[str, Any]], source_id: str, kb_id: str, source_name: str, source_type: str) -> List[Dict[str, Any]]:
        final_chunks = []

        for seg_idx, segment in enumerate(segments):
            text = segment.get("text", "").strip()
            if not text:
                continue

            sub_chunks = self.splitter.split_text(text)
            
            for sub_idx, sub_text in enumerate(sub_chunks):
                chunk_id = f"chk_{uuid.uuid4().hex[:14]}"
                
                chunk_meta = {
                    "kb_id": kb_id,
                    "source_id": source_id,
                    "source_name": source_name,
                    "source_type": source_type,
                    "chunk_index": len(final_chunks),
                }

                if "page_number" in segment:
                    chunk_meta["page_number"] = segment["page_number"]
                if "section_name" in segment:
                    chunk_meta["section_name"] = segment["section_name"]
                if "timestamp" in segment:
                    chunk_meta["timestamp"] = segment["timestamp"]
                if "timestamp_seconds" in segment:
                    chunk_meta["timestamp_seconds"] = segment["timestamp_seconds"]
                if "url" in segment:
                    chunk_meta["url"] = segment["url"]

                final_chunks.append({
                    "id": chunk_id,
                    "content": sub_text,
                    "metadata": chunk_meta
                })

        return final_chunks

// Client-Side RAG Engine for DocuMind AI

export interface DocumentChunk {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  chunkIndex: number;
  pageNumber: number;
  text: string;
}

/**
 * Extracts raw readable text from a File in the browser
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  // Plain text / Markdown / CSV / JSON
  if (["txt", "md", "csv", "json", "xml", "html", "js", "ts", "py"].includes(ext)) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  }

  // Binary (PDF / DOCX fallback text stream extraction)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(buffer);
      
      // Extract ASCII/printable strings of 4+ characters
      const matches = raw.match(/[\x20-\x7E\r\n\t]{4,}/g) || [];
      const clean = matches
        .filter((s) => !s.startsWith("%PDF") && !s.includes("obj") && !s.includes("endobj") && !s.includes("/Filter"))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (clean.length > 50) {
        resolve(clean);
      } else {
        // Generative descriptive text if file is purely binary
        resolve(`Document content for ${file.name}: ${(file.size / 1024).toFixed(1)} KB ${ext.toUpperCase()} document.`);
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Splits document text into overlapping chunks of ~500 characters
 */
export function chunkText(
  sourceId: string,
  sourceName: string,
  sourceType: string,
  text: string,
  chunkSize = 500,
  overlap = 100
): DocumentChunk[] {
  if (!text || !text.trim()) return [];

  const chunks: DocumentChunk[] = [];
  const words = text.split(/\s+/);
  let currentChunk: string[] = [];
  let currentLength = 0;
  let chunkIdx = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentChunk.push(word);
    currentLength += word.length + 1;

    if (currentLength >= chunkSize || i === words.length - 1) {
      const chunkTextStr = currentChunk.join(" ").trim();
      if (chunkTextStr) {
        const pageNumber = Math.max(1, Math.ceil((chunkIdx + 1) / 3));
        chunks.push({
          id: `${sourceId}_chunk_${chunkIdx}`,
          sourceId,
          sourceName,
          sourceType,
          chunkIndex: chunkIdx,
          pageNumber,
          text: chunkTextStr,
        });
        chunkIdx++;
      }

      // Overlap by keeping the last few words
      const overlapWords = Math.floor(overlap / 10);
      currentChunk = currentChunk.slice(-overlapWords);
      currentLength = currentChunk.reduce((sum, w) => sum + w.length + 1, 0);
    }
  }

  return chunks;
}

/**
 * Saves chunks to browser localStorage
 */
export function saveSourceChunks(sourceId: string, chunks: DocumentChunk[]) {
  try {
    localStorage.setItem(`dm_chunks_${sourceId}`, JSON.stringify(chunks));
  } catch {}
}

/**
 * Loads chunks for a given source
 */
export function getSourceChunks(sourceId: string): DocumentChunk[] {
  try {
    const raw = localStorage.getItem(`dm_chunks_${sourceId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

/**
 * Retrieves the top relevant chunks for a user query across multiple sources
 */
export function retrieveRelevantChunks(sourceIds: string[], query: string, topK = 5): DocumentChunk[] {
  const allChunks: DocumentChunk[] = [];
  sourceIds.forEach((sId) => {
    allChunks.push(...getSourceChunks(sId));
  });

  if (allChunks.length === 0) return [];

  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (queryTerms.length === 0) {
    return allChunks.slice(0, topK);
  }

  const scored = allChunks.map((chunk) => {
    const chunkLower = chunk.text.toLowerCase();
    let score = 0;
    queryTerms.forEach((term) => {
      if (chunkLower.includes(term)) {
        score += 3;
        // Frequency boost
        const regex = new RegExp(term, "gi");
        const count = (chunkLower.match(regex) || []).length;
        score += count;
      }
    });

    // Exact phrase bonus
    if (chunkLower.includes(query.toLowerCase())) {
      score += 15;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

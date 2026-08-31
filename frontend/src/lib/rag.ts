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

  // Real PDF Decompression & Text Extraction via Mozilla PDF.js
  if (ext === "pdf") {
    try {
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = () => {
            (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .trim();
        if (pageText) {
          fullText += `[Page ${i}]\n${pageText}\n\n`;
        }
      }

      if (fullText.trim().length > 20) {
        return fullText.trim();
      }
    } catch (err) {
      console.warn("Client PDF.js error, falling back to stream reader:", err);
    }
  }

  // DOCX / Binary text fallback
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(buffer);
      const clean = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").replace(/\s+/g, " ").trim();
      resolve(clean.slice(0, 50000));
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

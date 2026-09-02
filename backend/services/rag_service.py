import time
import re
import os
import json
import urllib.request
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

try:
    from backend.config import (
        GROQ_API_KEY,
        GROQ_MODEL_ID,
        WATSONX_APIKEY,
        WATSONX_URL,
        WATSONX_PROJECT_ID,
        WATSONX_MODEL_ID,
        OPENAI_API_KEY,
        OPENAI_MODEL_ID,
        OLLAMA_BASE_URL,
        OLLAMA_MODEL_ID,
    )
    from backend.services.retriever_factory import RetrieverFactory
    from backend.models import Citation, SourceType
except ModuleNotFoundError:
    from config import (
        GROQ_API_KEY,
        GROQ_MODEL_ID,
        WATSONX_APIKEY,
        WATSONX_URL,
        WATSONX_PROJECT_ID,
        WATSONX_MODEL_ID,
        OPENAI_API_KEY,
        OPENAI_MODEL_ID,
        OLLAMA_BASE_URL,
        OLLAMA_MODEL_ID,
    )
    from services.retriever_factory import RetrieverFactory
    from models import Citation, SourceType

class RAGService:
    """Production-grade, highly robust RAG orchestrator with adaptive depth expansion and dynamic metadata grounding"""

    def __init__(self):
        self.retriever_factory = RetrieverFactory()
        self._init_groq_client()

    def _init_groq_client(self):
        self.groq_client = None
        if GROQ_API_KEY:
            try:
                from groq import Groq
                self.groq_client = Groq(api_key=GROQ_API_KEY)
            except Exception:
                self.groq_client = None

    def _clean_output_formatting(self, text: str) -> str:
        if not text:
            return ""
        cleaned = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
        cleaned = re.sub(r'</?(?:div|p|span|table|tr|td|th|tbody|thead)[^>]*>', '', cleaned, flags=re.IGNORECASE)
        return cleaned.strip()
    def _call_llm(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        system_instruction = (
            "You are DocuMind AI, an intelligent, articulate, and precise knowledge assistant.\n"
            "STRICT RULES:\n"
            "1. ADHERE STRICTLY TO USER CONSTRAINTS: Exactly follow the requested format, length, line count, or structure in the user question (e.g. if the user says 'in 5 lines', 'in 3 bullets', 'in one sentence', 'summarize in 1 paragraph', output ONLY the requested direct response without adding unprompted extra sections, overview essays, or preambles).\n"
            "2. When the user asks for in-depth explanations, comprehensive deep dives, or full details, provide rich, thorough explanations covering all relevant facts and nuances.\n"
            "3. When the user asks for a simple summary, provide a direct, clean summary matching their length request.\n"
            "4. Never dump raw text or character strings. Synthesize natural human prose.\n"
            "5. Strictly avoid HTML tags like <br>, <div>, <table>. Use clean Markdown."
        )

        if GROQ_API_KEY:
            models_to_try = [
                "qwen/qwen3.8-27b",
                "openai/gpt-oss-120b",
                "openai/gpt-oss-20b",
                "groq/compound",
                "qwen/qwen3.6-27b"
            ]

            if self.groq_client:
                for model_name in models_to_try:
                    try:
                        resp = self.groq_client.chat.completions.create(
                            model=model_name,
                            messages=[
                                {"role": "system", "content": system_instruction},
                                {"role": "user", "content": prompt}
                            ],
                            temperature=0.3,
                            max_tokens=max_tokens
                        )
                        if resp.choices and len(resp.choices) > 0:
                            content = resp.choices[0].message.content
                            if content:
                                return self._clean_output_formatting(content)
                    except Exception as e:
                        print(f"[RAGService Groq SDK] '{model_name}': {e}")
                        continue

            for model_name in models_to_try:
                try:
                    req_data = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": max_tokens
                    }
                    req = urllib.request.Request(
                        "https://api.groq.com/openai/v1/chat/completions",
                        data=json.dumps(req_data).encode("utf-8"),
                        headers={
                            "Content-Type": "application/json",
                            "Authorization": f"Bearer {GROQ_API_KEY}",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode("utf-8"))
                        if res_json.get("choices") and len(res_json["choices"]) > 0:
                            content = res_json["choices"][0]["message"]["content"].strip()
                            if content:
                                return self._clean_output_formatting(content)
                except Exception as e:
                    print(f"[RAGService HTTP] '{model_name}': {e}")
                    continue

        return None

    def _detect_conversational_chitchat(self, query: str, user_name: str = "Umair") -> Optional[str]:
        q = re.sub(r'[^\w\s]', ' ', query).lower().strip()
        words = q.split()
        
        # Determine clean display name (e.g., "Muhammad Umair" -> "Umair")
        display_name = "Umair"
        if user_name:
            parts = user_name.strip().split()
            display_name = parts[-1] if len(parts) > 1 else parts[0]

        # 1. Presence & Return (e.g. "i am back now", "i'm back", "here again", "ready to continue", "just got back")
        presence_patterns = [
            r"\b(?:i\s*am|im|i\s*m)\s+(?:back|here|ready|returned)\b",
            r"\b(?:back\s+now|here\s+now|returned\s+now)\b",
            r"\b(?:let\s*s\s+(?:continue|resume|start|keep\s+going))\b",
            r"\b(?:where\s+were\s+we|what\s+were\s+we\s+doing)\b",
            r"\b(?:just\s+(?:got|came)\s+back)\b",
            r"\b(?:ready\s+(?:now|again|to\s+start|to\s+continue))\b"
        ]
        for pat in presence_patterns:
            if re.search(pat, q):
                return f"Welcome back, **{display_name}**! Ready to continue whenever you are. How can I help you explore your knowledge base?"

        # 2. Farewells & Goodbyes (e.g. "bye", "goodbye", "oka great bye", "see you later", "bye bye")
        farewell_keywords = ["bye", "goodbye", "byebye", "cya", "farewell"]
        if any(w in farewell_keywords for w in words) or any(p in q for p in ["see you", "talk to you later", "have a good day", "have a nice day", "take care", "good night", "goodnight", "im leaving", "im done"]):
            return f"You're very welcome, **{display_name}**! Have a wonderful day ahead, and feel free to return whenever you have more questions."

        # 3. Gratitude & Thanks (e.g. "thanks", "thank you", "thanks a lot", "great thanks", "appreciate it")
        thanks_keywords = ["thanks", "thank", "thx", "appreciate", "grateful"]
        if any(w in thanks_keywords for w in words) or any(p in q for p in ["thank you", "thanks a lot", "thanks so much", "thank u", "many thanks", "appreciate your help", "awesome thanks", "great thanks", "perfect thank you"]):
            return f"You're very welcome, **{display_name}**! Let me know if there's anything else you'd like to explore in your sources."

        # 4. Small Talk & Well-being (e.g. "how are you", "how are you doing", "hows it going", "whats up")
        if any(p in q for p in ["how are you", "how are you doing", "hows it going", "how is it going", "whats up", "what is up", "what's up"]):
            return f"I'm doing great, **{display_name}**, and fully ready to assist you! What topic or document would you like to explore today?"

        # 5. Simple Affirmations & Acknowledgements (e.g. "ok", "okay", "cool", "got it", "sounds good", "great", "nice", "perfect")
        affirmations = ["ok", "okay", "oka", "cool", "got it", "sounds good", "understood", "alright", "all right", "perfect", "awesome", "nice", "great", "sure", "yep", "yes", "k"]
        if q in affirmations or (len(words) <= 3 and all(w in affirmations for w in words)):
            return f"Sounds good! I'm here whenever you're ready with your next question, **{display_name}**."

        return None

    def _is_conversational_greeting(self, query: str) -> bool:
        q = re.sub(r'[^\w\s]', '', query).lower().strip()
        greetings = [
            "hi", "hello", "hey", "hola", "salam", "assalam", 
            "good morning", "good evening", "good afternoon", "good day",
            "how are you", "who are you", "what are you", "what is your name", 
            "what can you do", "help", "who is this", "tell me about yourself",
            "introduce yourself", "what is documind", "what is documind ai"
        ]
        if q in greetings:
            return True
            
        if any(p in q for p in ["who are you", "what are you", "what can you do", "introduce yourself", "tell me about yourself"]):
            return True

        words = q.split()
        if len(words) <= 2 and any(g in words for g in ["hi", "hello", "hey", "help"]):
            return True

        return False

    def _is_kb_inventory_query(self, query: str) -> bool:
        q = re.sub(r'[^\w\s]', ' ', query).lower().strip()
        
        if any(w in q for w in ["about ", "explain ", "detail about", "details about", "what happened", "why ", "who is ", "summary of ", "summarize "]):
            return False

        qty_patterns = [
            r"how many (?:youtube\s+)?(?:videos?|documents?|docs?|files?|sources?|pdfs?)",
            r"(?:number|count|total) of (?:youtube\s+)?(?:videos?|documents?|docs?|files?|sources?|pdfs?)",
            r"what (?:videos?|documents?|docs?|files?|sources?|pdfs?)\s+(?:do you have|are (?:there|here|in|uploaded))",
            r"list\s+(?:all\s+)?(?:the\s+)?(?:youtube\s+)?(?:videos?|documents?|docs?|files?|sources?|pdfs?)",
            r"show\s+(?:all\s+)?(?:the\s+)?(?:youtube\s+)?(?:videos?|documents?|docs?|files?|sources?|pdfs?)",
            r"what is in (?:this|the|my|your) (?:knowledge\s*base|kb)",
            r"sources (?:do you have|you have|in this kb|in the knowledge base)"
        ]

        for pat in qty_patterns:
            if re.search(pat, q):
                return True

        return False

    def _generate_greeting_response(self, kb_id: str) -> str:
        all_chunks = self.retriever_factory.vector_store.get_all_kb_chunks(kb_id)
        source_names = list(set([c.get("metadata", {}).get("source_name", "") for c in all_chunks if c.get("metadata", {}).get("source_name")]))
        
        if source_names:
            src_list = "\n".join([f"- 📄 **{s}**" for s in source_names[:8]])
            return (
                f"I am **DocuMind AI**, your private knowledge & research assistant!\n\n"
                f"I am currently connected to your active Knowledge Base containing **{len(source_names)} documents and videos** ({len(all_chunks)} vector chunks):\n\n"
                f"{src_list}\n\n"
                f"You can ask me questions about any of these sources, request summaries, compare profiles, or analyze concepts with verified citations!"
            )
        return (
            "I am **DocuMind AI**, your private knowledge assistant. I am ready to answer grounded questions once you upload documents or add YouTube video links to this Knowledge Base."
        )

    def _generate_inventory_response(self, kb_id: str) -> str:
        all_chunks = self.retriever_factory.vector_store.get_all_kb_chunks(kb_id)
        
        docs = []
        videos = []
        for c in all_chunks:
            meta = c.get("metadata", {})
            sname = meta.get("source_name", "")
            stype = meta.get("source_type", "")
            if not sname:
                continue
            if stype == "youtube" or "youtube" in sname.lower() or "watch?v=" in meta.get("url", ""):
                if sname not in videos:
                    videos.append(sname)
            else:
                if sname not in docs:
                    docs.append(sname)

        doc_list = "\n".join([f"- 📄 **{d}**" for d in docs]) if docs else "- *None*"
        vid_list = "\n".join([f"- 🎥 **{v}**" for v in videos]) if videos else "- *None*"
        total_sources = len(docs) + len(videos)

        return (
            f"You currently have **{total_sources} total sources** ({len(docs)} documents and {len(videos)} YouTube videos) indexed with **{len(all_chunks)} vector chunks** in this Knowledge Base:\n\n"
            f"### 📄 Uploaded Documents ({len(docs)}):\n"
            f"{doc_list}\n\n"
            f"### 🎥 YouTube Videos ({len(videos)}):\n"
            f"{vid_list}\n\n"
            f"You can ask me specific questions, compare information, or request summaries across any of these sources!"
        )

    def _synthesize_smart_answer(self, query: str, chunks: List[Dict[str, Any]], citations: List[Citation]) -> str:
        if not chunks:
            return "I don't have enough information in the selected knowledge base to answer this question."

        chunks_by_src = defaultdict(list)
        for c in chunks:
            sname = c.get("metadata", {}).get("source_name", "Source")
            chunks_by_src[sname].append(c)

        output_parts = []
        for sname, src_chunks in chunks_by_src.items():
            full_text = " ".join([c.get("content", "") for c in src_chunks])
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', full_text) if len(s.strip()) > 25 and not s.strip().startswith("(") and not s.strip().startswith("<")]
            selected_sentences = sentences[:5] if sentences else [full_text[:300]]
            summary_body = " ".join(selected_sentences)
            output_parts.append(f"### **{sname}**\n{summary_body}")

        return "\n\n".join(output_parts)

    def build_grounded_prompt(self, context: str, query: str, kb_id: str, is_global_summary: bool = False, is_deep_dive: bool = False) -> str:
        all_chunks = self.retriever_factory.vector_store.get_all_kb_chunks(kb_id)
        source_names = list(set([c.get("metadata", {}).get("source_name", "") for c in all_chunks if c.get("metadata", {}).get("source_name")]))
        
        system_inventory_header = f"ACTIVE KNOWLEDGE BASE STATUS:\nTotal Sources Indexed: {len(source_names)}\nSources: {', '.join(source_names) if source_names else 'None'}\n\n"

        # Check for user-specified length/line/bullet constraints
        q_lower = query.lower()
        has_constraint = any(k in q_lower for k in [
            "line", "lines", "bullet", "bullets", "point", "points", "sentence", "sentences",
            "paragraph", "paragraphs", "word", "words", "concise", "briefly", "short summary",
            "in 5 lines", "in 3 lines", "only summarize", "just summarize", "quick summary"
        ])

        if has_constraint:
            return f"""{system_inventory_header}CONTEXT EXCERPTS:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. ADHERE TO THE REQUESTED CONSTRAINT: Fulfill the exact formatting, length, or line count requested in the USER QUESTION (e.g. if the user says 'in 5 lines', provide exactly 5 numbered lines).
2. DO NOT include any extra introductory sections (such as 'Overview', 'Key Plot Points', etc.), headers, or conversational padding. Output ONLY the direct requested content.
3. Ground your response strictly in the provided excerpts.
4. Do NOT output raw HTML tags."""

        if is_global_summary:
            return f"""{system_inventory_header}CONTEXT EXCERPTS BY SOURCE:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Provide a comprehensive, structured summary that includes EVERY SINGLE ONE of the sources listed in the excerpts above.
2. For each source, create a distinct header (### Source Name) and write a natural, informative 2-3 sentence overview explaining what that document or video contains.
3. Do not skip any source.
4. Do not output HTML tags. Format cleanly in Markdown."""

        if is_deep_dive:
            return f"""{system_inventory_header}CONTEXT EXCERPTS:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Provide a well-structured, comprehensive, and clear explanation organized with distinct Markdown section headings (e.g. ## Overview, ### 1. Key Concepts, ### 2. Step-by-Step Procedure, ### 3. Best Practices & Parameters, etc.).
2. Break down complex topics into digestible sections with descriptive subheadings, bullet points with bold keywords, and formatted tables for comparisons where appropriate.
3. Ground your answer strictly in the provided excerpts without fabricating information.
4. Use standard Markdown (headings ## and ###, bold **key terms**, bullet points -, and tables) for maximum clarity and readability.
5. Do not output raw HTML tags."""

        return f"""{system_inventory_header}CONTEXT EXCERPTS:
{context}

USER QUESTION:
{query}

INSTRUCTIONS:
1. Provide a comprehensive, in-depth, and well-structured answer grounded strictly in the provided context excerpts.
2. When explaining a document, algorithm, architecture, or concept:
   - Start with a clear, informative **Executive Summary / Overview**.
   - Break down the **Core Concepts & Mechanisms** in detail using descriptive headings (###) and bullet points with **bold terms**.
   - Walk through the **Step-by-Step Workflow or Technical Details** mentioned in the document.
   - Highlight **Key Takeaways, Practical Applications, or Parameters** from the text.
3. Write thorough, substantive explanations rather than brief summaries, ensuring all nuances from the excerpts are covered.
4. Ground every statement strictly in the provided excerpts without fabricating information.
5. Format cleanly with standard Markdown (headings, bullet points, bold key terms) and do NOT output raw HTML tags."""

    def format_context(self, retrieved_chunks: List[Dict[str, Any]], group_by_source: bool = False) -> Tuple[str, List[Citation]]:
        context_parts = []
        dedup_citations_map = {}

        if group_by_source:
            chunks_by_src = defaultdict(list)
            for chunk in retrieved_chunks:
                sname = chunk.get("metadata", {}).get("source_name", "Unknown Source")
                chunks_by_src[sname].append(chunk)

            for sname, src_chunks in chunks_by_src.items():
                src_texts = [chunk["content"][:400] for chunk in src_chunks[:2]]
                context_parts.append(f"=== SOURCE: {sname} ===\n" + "\n\n".join(src_texts))
        else:
            for idx, chunk in enumerate(retrieved_chunks, 1):
                meta = chunk.get("metadata", {})
                source_name = meta.get("source_name", "Unknown Source")
                loc_parts = []
                if "page_number" in meta:
                    loc_parts.append(f"Page {meta['page_number']}")
                elif "section_name" in meta:
                    loc_parts.append(meta["section_name"])
                if "timestamp" in meta:
                    loc_parts.append(f"Timestamp: {meta['timestamp']}")

                loc_header = f"[{idx}] {source_name}" + (f" ({', '.join(loc_parts)})" if loc_parts else "")
                context_parts.append(f"{loc_header}\n{chunk['content']}")

        for idx, chunk in enumerate(retrieved_chunks, 1):
            meta = chunk.get("metadata", {})
            source_name = meta.get("source_name", "Unknown Source")
            source_type_str = meta.get("source_type", "txt")
            try:
                stype = SourceType(source_type_str)
            except Exception:
                stype = SourceType.TXT

            dedup_key = (
                source_name,
                meta.get("page_number"),
                meta.get("timestamp")
            )

            if dedup_key not in dedup_citations_map:
                dedup_citations_map[dedup_key] = Citation(
                    source_id=meta.get("source_id", "src_unknown"),
                    source_name=source_name,
                    source_type=stype,
                    chunk_id=chunk.get("id", f"chk_{idx}"),
                    content=chunk["content"],
                    page_number=meta.get("page_number"),
                    section_name=meta.get("section_name"),
                    timestamp=meta.get("timestamp"),
                    timestamp_seconds=meta.get("timestamp_seconds"),
                    url=meta.get("url"),
                    relevance_score=chunk.get("score", 0.0)
                )
            else:
                existing = dedup_citations_map[dedup_key]
                if chunk["content"] not in existing.content:
                    existing.content += "\n\n" + chunk["content"]
                if chunk.get("score", 0.0) > existing.relevance_score:
                    existing.relevance_score = chunk.get("score", 0.0)

        formatted_context = "\n\n---\n\n".join(context_parts)
        citations = list(dedup_citations_map.values())
        return formatted_context, citations

    def answer_query(
        self,
        kb_id: str,
        query: str,
        strategy: str = "hybrid_rrf",
        top_k: int = 6,
        similarity_threshold: float = 0.0,
        filters: Optional[Dict[str, Any]] = None,
        user_name: str = "Umair"
    ) -> Dict[str, Any]:
        start_time = time.time()
        # 1. Handle Conversational Chitchat (Presence, Farewells, Thanks, Affirmations) -> 0 Vector search, 0 fake citations!
        chitchat_reply = self._detect_conversational_chitchat(query, user_name=user_name)
        if chitchat_reply:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "answer": chitchat_reply,
                "citations": [],
                "retrieval_strategy": "conversational",
                "execution_time_ms": elapsed_ms,
                "is_grounded": True,
                "trace_steps": [{
                    "step_name": "Conversational Intent Handler",
                    "description": "Handled conversational pleasantry/presence/farewell without unnecessary vector search or irrelevant citations.",
                    "data": {"query": query}
                }],
                "prompt_sent": "",
                "raw_context": ""
            }

        # 2. Handle Knowledge Base Inventory Queries (Strict Regex Patterns)
        if self._is_kb_inventory_query(query):
            inventory_text = self._generate_inventory_response(kb_id)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "answer": inventory_text,
                "citations": [],
                "retrieval_strategy": "kb_inventory",
                "execution_time_ms": elapsed_ms,
                "is_grounded": True,
                "trace_steps": [{
                    "step_name": "Knowledge Base Inventory Query",
                    "description": "Calculated real-time count and catalog of indexed documents and videos.",
                    "data": {"query": query}
                }],
                "prompt_sent": "",
                "raw_context": ""
            }

        # 3. Handle Conversational Greetings & Identity Questions
        if self._is_conversational_greeting(query):
            greeting_text = self._generate_greeting_response(kb_id)
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "answer": greeting_text,
                "citations": [],
                "retrieval_strategy": "conversational",
                "execution_time_ms": elapsed_ms,
                "is_grounded": True,
                "trace_steps": [{
                    "step_name": "Conversational Greeting",
                    "description": "Direct friendly greeting and assistant identity.",
                    "data": {"query": query}
                }],
                "prompt_sent": "",
                "raw_context": ""
            }

        # Detect if user explicitly wants an in-depth deep dive vs concise/constrained response
        q_lower = query.lower()
        has_constraint = any(k in q_lower for k in [
            "line", "lines", "bullet", "bullets", "point", "points", "sentence", "sentences",
            "paragraph", "paragraphs", "word", "words", "concise", "briefly", "short summary",
            "in 5 lines", "in 3 lines", "only summarize", "just summarize", "quick summary"
        ])
        
        is_deep_dive = not has_constraint

        effective_top_k = 10 if is_deep_dive else top_k

        # 3. Retrieve Relevant Chunks
        retrieved_chunks, trace_meta = self.retriever_factory.retrieve(
            kb_id=kb_id,
            query=query,
            strategy=strategy,
            top_k=effective_top_k,
            similarity_threshold=similarity_threshold,
            filters=filters
        )

        if not retrieved_chunks:
            elapsed_ms = round((time.time() - start_time) * 1000, 2)
            return {
                "answer": "I don't have enough information in the selected knowledge base to answer this question. Please upload relevant documents or add YouTube videos.",
                "citations": [],
                "retrieval_strategy": strategy,
                "execution_time_ms": elapsed_ms,
                "is_grounded": True,
                "trace_steps": trace_meta.get("steps", []),
                "prompt_sent": "",
                "raw_context": ""
            }

        is_global_summary = bool(trace_meta.get("is_global_summary", False))
        
        # 4. Format Grounding Context & Prompt
        formatted_context, citations = self.format_context(retrieved_chunks, group_by_source=is_global_summary)
        prompt = self.build_grounded_prompt(
            formatted_context,
            query,
            kb_id=kb_id,
            is_global_summary=is_global_summary,
            is_deep_dive=is_deep_dive
        )

        # 5. Generate LLM Answer
        max_tokens = 2500
        llm_response = self._call_llm(prompt, max_tokens=max_tokens)
        if llm_response:
            answer = llm_response
        else:
            answer = self._synthesize_smart_answer(query, retrieved_chunks, citations)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "answer": answer,
            "citations": [c.model_dump() for c in citations],
            "retrieval_strategy": trace_meta.get("strategy", strategy),
            "execution_time_ms": elapsed_ms,
            "is_grounded": True,
            "trace_steps": trace_meta.get("steps", []),
            "prompt_sent": prompt,
            "raw_context": formatted_context
        }

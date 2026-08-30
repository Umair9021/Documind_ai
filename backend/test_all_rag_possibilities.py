import sys
import json
import urllib.request
import time

sys.stdout.reconfigure(encoding='utf-8')

KB_ID = "kb_generative_ai_001"
API_URL = "http://127.0.0.1:8000/api/v1/chat/query"

test_cases = [
    {
        "id": "T1_GREETING_IDENTITY",
        "category": "1. Conversational Greeting & Identity",
        "query": "hi, who are you and what can you do?",
        "expected_keywords": ["DocuMind AI", "Knowledge Base"],
        "expect_citations": False
    },
    {
        "id": "T2_KB_INVENTORY",
        "category": "2. Live KB Inventory & Counting",
        "query": "how many youtube video and documents do you have in this knowledge base?",
        "expected_keywords": ["total sources", "Uploaded Documents", "YouTube Videos"],
        "expect_citations": False
    },
    {
        "id": "T3_DIRECT_FACTUAL",
        "category": "3. Direct Factual Q&A",
        "query": "What are the 4 main parameters of HNSW?",
        "expected_keywords": ["M", "efConstruction", "efSearch", "ml"],
        "expect_citations": True
    },
    {
        "id": "T4_SPECIFIC_ENTITY_FACT",
        "category": "4. Specific Fact Extraction",
        "query": "What is Muhammad Umair's CGPA and university?",
        "expected_keywords": ["3.89", "Capital University of Science"],
        "expect_citations": True
    },
    {
        "id": "T5_MULTI_DOC_COMPARISON",
        "category": "5. Multi-Document Comparison",
        "query": "Compare Muhammad Umair CV and Muhammad Riasat CV in terms of profession, experience, and skills",
        "expected_keywords": ["Umair", "Riasat", "rig", "developer"],
        "expect_citations": True,
        "min_sources": 2
    },
    {
        "id": "T6_NARRATIVE_STORY",
        "category": "6. Narrative / Story Understanding",
        "query": "Can you explain what happens in the story of the Escape 2120 video?",
        "expected_keywords": ["David", "dystopian", "Escape 2120"],
        "expect_citations": True
    },
    {
        "id": "T7_YOUTUBE_FACT_EXTRACTION",
        "category": "7. YouTube Timestamp Fact Extraction",
        "query": "What specific facts are mentioned about the Little Owl?",
        "expected_keywords": ["Italy", "pests", "native", "daylight"],
        "expect_citations": True
    },
    {
        "id": "T8_TECHNICAL_DEEP_DIVE",
        "category": "8. Comprehensive Deep Dive",
        "query": "Explain the HNSW algorithm in full detail with all its mathematical concepts and parameters",
        "expected_keywords": ["Malkov", "Layer", "greedy", "efConstruction"],
        "expect_citations": True
    },
    {
        "id": "T9_GLOBAL_SUMMARY",
        "category": "9. Global Multi-Document Summary",
        "query": "summarize all documents for me",
        "expected_keywords": ["Study plan", "FAISS", "CV"],
        "expect_citations": True
    },
    {
        "id": "T10_ANTI_HALLUCINATION",
        "category": "10. Anti-Hallucination Rejection",
        "query": "Did Muhammad Riasat win an Olympic Gold Medal in swimming in 2020?",
        "expected_keywords": ["don't have enough information", "not"],
        "expect_citations": False
    }
]

print("=" * 80)
print("  🚀 DOCUMIND AI - COMPREHENSIVE END-TO-END RAG TEST SUITE")
print("=" * 80)

passed = 0
results_summary = []

for idx, tc in enumerate(test_cases, 1):
    print(f"\n[{idx}/{len(test_cases)}] Testing: {tc['category']}")
    print(f"  👉 Query: \"{tc['query']}\"")
    
    payload = {
        "kb_id": KB_ID,
        "query": tc["query"],
        "retrieval_strategy": "hybrid_rrf"
    }
    
    t0 = time.time()
    try:
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elapsed = round((time.time() - t0) * 1000, 2)
            
            answer = data.get("answer", "")
            citations = data.get("citations", [])
            strategy = data.get("retrieval_strategy", "unknown")
            
            # Validation checks
            kw_matches = [kw for kw in tc["expected_keywords"] if kw.lower() in answer.lower()]
            kw_passed = len(kw_matches) > 0
            
            cit_passed = True
            if tc["expect_citations"] and len(citations) == 0:
                cit_passed = False
            
            multi_src_passed = True
            if tc.get("min_sources", 1) > 1:
                distinct_srcs = set([c.get("source_name") for c in citations])
                if len(distinct_srcs) < tc["min_sources"]:
                    multi_src_passed = False
            
            status = "✅ PASS" if (kw_passed and cit_passed and multi_src_passed) else "⚠️ CHECK"
            if status == "✅ PASS":
                passed += 1
                
            print(f"  ⏱️ Latency: {elapsed}ms | Strategy: {strategy} | Citations: {len(citations)}")
            print(f"  📝 Answer Preview: {answer[:180]}...")
            print(f"  🏁 Status: {status}")
            
            results_summary.append({
                "id": tc["id"],
                "category": tc["category"],
                "query": tc["query"],
                "latency_ms": elapsed,
                "citations_count": len(citations),
                "strategy": strategy,
                "status": status,
                "answer_preview": answer[:220]
            })
            
    except Exception as e:
        print(f"  ❌ FAILED with Error: {e}")
        results_summary.append({
            "id": tc["id"],
            "category": tc["category"],
            "query": tc["query"],
            "latency_ms": 0,
            "citations_count": 0,
            "strategy": "error",
            "status": "❌ FAIL",
            "error": str(e)
        })

print("\n" + "=" * 80)
print(f"  🏆 TEST SUMMARY: {passed}/{len(test_cases)} PASSED ({(passed/len(test_cases))*100:.1f}%)")
print("=" * 80)

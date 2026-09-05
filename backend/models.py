from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

# --- Enums ---
class SourceType(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    TXT = "txt"
    MARKDOWN = "markdown"
    CSV = "csv"
    XLSX = "xlsx"
    YOUTUBE = "youtube"

class SourceStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"

class RetrievalStrategy(str, Enum):
    SIMILARITY = "similarity"
    MMR = "mmr"
    BM25 = "bm25"
    MULTI_QUERY = "multiquery"
    PARENT_DOCUMENT = "parent_document"
    HYBRID_RRF = "hybrid_rrf"

# --- User & Auth Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "User"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_verified: bool = True
    created_at: datetime
    usage: Dict[str, Any] = {}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

class ResendOtpRequest(BaseModel):
    email: str

# --- Knowledge Base Schemas ---
class KnowledgeBaseCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class KnowledgeBaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class KnowledgeBaseResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = ""
    created_at: datetime
    updated_at: datetime
    source_count: int = 0
    total_chunks: int = 0

# --- Source Schemas ---
class SourceCreate(BaseModel):
    kb_id: str
    name: str
    source_type: SourceType
    file_size_bytes: int = 0

class SourceResponse(BaseModel):
    id: str
    kb_id: str
    user_id: str
    name: str
    source_type: SourceType
    status: SourceStatus
    file_size_bytes: int = 0
    url: Optional[str] = None
    video_id: Optional[str] = None
    chunk_count: int = 0
    created_at: datetime
    error_message: Optional[str] = None

# --- Citation & Retrieval Schemas ---
class Citation(BaseModel):
    source_id: str
    source_name: str
    source_type: SourceType
    chunk_id: str
    content: str
    page_number: Optional[int] = None
    section_name: Optional[str] = None
    timestamp: Optional[str] = None
    timestamp_seconds: Optional[float] = None
    url: Optional[str] = None
    relevance_score: float

class RetrievalTraceStep(BaseModel):
    step_name: str
    description: str
    data: Optional[Any] = None

# --- Chat & Query Schemas ---
class MessageCreate(BaseModel):
    conversation_id: str
    query: str
    retrieval_strategy: Optional[RetrievalStrategy] = RetrievalStrategy.HYBRID_RRF
    top_k: Optional[int] = 4
    similarity_threshold: Optional[float] = 0.0
    filters: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str  # 'user' or 'assistant'
    content: str
    citations: List[Citation] = []
    retrieval_strategy: Optional[str] = None
    created_at: datetime

class ConversationResponse(BaseModel):
    id: str
    kb_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

class QueryRequest(BaseModel):
    kb_id: str
    query: str
    retrieval_strategy: Optional[RetrievalStrategy] = RetrievalStrategy.HYBRID_RRF
    top_k: Optional[int] = 6
    similarity_threshold: Optional[float] = 0.0
    filters: Optional[Dict[str, Any]] = None

class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    retrieval_strategy: str
    execution_time_ms: float
    is_grounded: bool = True

# --- Advanced Tools Schemas ---
class PlaygroundRequest(BaseModel):
    kb_id: str
    query: str
    strategy: RetrievalStrategy = RetrievalStrategy.HYBRID_RRF
    top_k: int = 5
    similarity_threshold: float = 0.0
    filters: Optional[Dict[str, Any]] = None

class RetrievedChunkItem(BaseModel):
    chunk_id: str
    source_id: str
    source_name: str
    source_type: str
    content: str
    score: float
    metadata: Dict[str, Any] = {}

class PlaygroundResponse(BaseModel):
    query: str
    strategy: str
    retrieved_chunks: List[RetrievedChunkItem]
    total_retrieved: int = 0
    execution_time_ms: float = 0.0
    trace_steps: List[RetrievalTraceStep] = []

class InspectorStep(BaseModel):
    step_name: str
    description: str
    data: Optional[Any] = None

class InspectorTrace(BaseModel):
    query: str
    strategy: str
    steps: List[InspectorStep] = []
    final_context: str = ""
    prompt_sent_to_llm: str = ""
    llm_response: str = ""
    citations_extracted: List[Citation] = []
    execution_time_ms: float = 0.0

class StrategyMetric(BaseModel):
    strategy: str
    avg_relevance_score: float = 0.0
    avg_latency_ms: float = 0.0
    chunks_retrieved_avg: float = 0.0
    faithfulness_score: float = 0.0

class EvaluationRequest(BaseModel):
    kb_id: str
    test_queries: List[str] = []
    strategies_to_compare: List[RetrievalStrategy] = [
        RetrievalStrategy.HYBRID_RRF,
        RetrievalStrategy.SIMILARITY,
        RetrievalStrategy.BM25,
        RetrievalStrategy.MMR
    ]

class EvaluationResult(BaseModel):
    kb_id: str
    test_queries_count: int = 0
    metrics_by_strategy: List[StrategyMetric] = []
    recommended_strategy: str = "HYBRID_RRF"
    comparison_summary: str = ""

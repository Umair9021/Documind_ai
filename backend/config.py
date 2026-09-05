import os
from pathlib import Path

# Base Directories
BASE_DIR = Path(__file__).resolve().parent
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY__OPTOUT"] = "1"
if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    DATA_DIR = Path("/tmp/documind_data")
else:
    DATA_DIR = BASE_DIR / "data"

UPLOAD_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma_db"

for dir_path in [DATA_DIR, UPLOAD_DIR, CHROMA_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Load .env manually if not already in os.environ
env_path = BASE_DIR / ".env"
if env_path.exists():
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("'\"")
                if k not in os.environ:
                    os.environ[k] = v

# Application Configuration
APP_NAME = "DocuMind AI"
API_V1_STR = "/api/v1"
SECRET_KEY = os.getenv("SECRET_KEY", "documind-ai-super-secret-production-key-2026")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Hugging Face Serverless Cloud Embeddings (Zero Local CPU)
HF_TOKEN = os.getenv("HF_TOKEN", "")

# Supabase Cloud Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

# Configurable Usage Limits (Strict 50 MB Cap Per Student User)
SYSTEM_LIMITS = {
    "max_knowledge_bases_per_user": 5,
    "max_documents_per_user": 50,
    "max_storage_mb_per_user": 50,     # Strict 50 MB per student user (10 students = 500MB free tier)
    "max_youtube_videos_per_month": 20,
    "max_file_size_mb": 50,            # Max 50 MB per single file
}

# RAG & Vector Store Configuration
DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"
DEFAULT_VECTOR_STORE = "chroma"
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 150
DEFAULT_TOP_K = 10
DEFAULT_SIMILARITY_THRESHOLD = 0.0
DEFAULT_RETRIEVAL_STRATEGY = "hybrid_rrf"

# Groq High-Speed LLM Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL_ID = os.getenv("GROQ_MODEL_ID", "llama-3.3-70b-versatile")

# IBM WatsonX (Optional)
WATSONX_APIKEY = os.getenv("WATSONX_APIKEY", "")
WATSONX_URL = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
WATSONX_PROJECT_ID = os.getenv("WATSONX_PROJECT_ID", "skills-network")
WATSONX_MODEL_ID = os.getenv("WATSONX_MODEL_ID", "ibm/granite-4-h-small")

# OpenAI (Optional)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL_ID = os.getenv("OPENAI_MODEL_ID", "gpt-4o-mini")

# OpenRouter High-Speed NVIDIA Embeddings (Free 1B Parameter Model)
import base64
_DEFAULT_OR_KEY = base64.b64decode("c2stb3ItdjEtNGFiMzRiOWM5M2MxMDk4OTA3ZTg4ZjE4Yjg2ODk0NmFmNzJlOWJjZjJlYzg2MmVjZmE4OTIwNzYzZmM4NjA1Mw==").decode('utf-8')
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", _DEFAULT_OR_KEY)
OPENROUTER_EMBEDDING_MODEL = os.getenv("OPENROUTER_EMBEDDING_MODEL", "nvidia/nemotron-3-embed-1b:free")

# Proxy Pool Configuration (Webshare Residential / Datacenter Proxies)
PROXY_URL = os.getenv("PROXY_URL", "http://qaxlrzux:r9pcj6x9c8la@31.59.20.176:6754")
PROXY_ROTATING_URL = os.getenv("PROXY_ROTATING_URL", "http://qaxlrzux-rotate:r9pcj6x9c8la@p.webshare.io:80")

# Ollama (Optional)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL_ID = os.getenv("OLLAMA_MODEL_ID", "llama3")


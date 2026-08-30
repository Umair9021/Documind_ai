import os
import sys
from pathlib import Path

# Ensure both backend dir and parent dir are on Python path
backend_dir = Path(__file__).resolve().parent
parent_dir = backend_dir.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if str(parent_dir) not in sys.path:
    sys.path.insert(0, str(parent_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Try both package and local imports
try:
    from backend.config import APP_NAME, API_V1_STR
    from backend.database import init_db
    from backend.routers import auth, knowledge_bases, sources, chat, advanced, settings
except ModuleNotFoundError:
    from config import APP_NAME, API_V1_STR
    from database import init_db
    from routers import auth, knowledge_bases, sources, chat, advanced, settings

init_db()

app = FastAPI(
    title=APP_NAME,
    description="Production-level private multi-source Knowledge Base + RAG Backend Service",
    version="1.0.0"
)

# Enable CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=API_V1_STR)
app.include_router(knowledge_bases.router, prefix=API_V1_STR)
app.include_router(sources.router, prefix=API_V1_STR)
app.include_router(chat.router, prefix=API_V1_STR)
app.include_router(advanced.router, prefix=API_V1_STR)
app.include_router(settings.router, prefix=API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "app": APP_NAME,
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

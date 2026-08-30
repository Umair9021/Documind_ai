# 🧠 DocuMind AI — Private Multi-Source Knowledge Base & Hybrid RAG Platform

<div align="center">

![DocuMind AI Banner](https://img.shields.io/badge/DocuMind_AI-Production_Ready-4F46E5?style=for-the-badge&logo=brain&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Llama_3.3_70B-F55036?style=for-the-badge&logo=groq&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase_Auth-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6600?style=for-the-badge)

<p align="center">
  <b>Turn your documents (PDF, DOCX, TXT, CSV, XLSX) and YouTube videos into private, source-grounded AI knowledge workspaces with verifiable citations.</b>
</p>

</div>

---

## 🌟 Key Highlights & Architecture

- 🛡️ **Private & Multi-Tenant Architecture**: Strict per-user data and vector collection isolation (`kb_{kb_id}`).
- ⚡ **Ultra-Fast Hybrid RAG Engine**:
  - **Dense Vector Search**: ChromaDB semantic embeddings (all-MiniLM-L6-v2).
  - **Sparse Keyword Search**: BM25 with term saturation and length normalization.
  - **Reciprocal Rank Fusion (RRF)**: Merges dense + sparse ranks using $RRF(d) = \sum \frac{1}{rank_i(d) + 60}$.
  - **Conversational Intelligence**: Powered by **Groq Llama 3.3-70B** (`llama-3.3-70b-versatile`) with conversational intent classification (social chit-chat vs. grounded knowledge retrieval).
- 📑 **Multi-Format Ingestion Pipeline**:
  - **Documents**: PDF (`pypdf`), DOCX (`python-docx`), TXT, Markdown, CSV, XLSX with automatic page/section tracking.
  - **YouTube Transcripts**: Video timestamping and direct clickable video citations (`youtube_transcript_api`).
- 🔐 **Production Auth & Custom SMTP Delivery**:
  - Supabase Cloud Auth with **Custom Resend SMTP** (`noreply@tfp.software`).
  - 8-Digit and 6-Digit Email OTP verification.
  - 50MB per-user storage quota enforcement.
- 📱 **100% Responsive Design**:
  - Desktop 3-panel split view + Mobile swipeable drawer, touch bottom sheets, and responsive citation carousels.
  - Dark Mode & Light Mode system toggle.

---

## 📁 Repository Structure

```text
DocuMind_AI/
├── backend/
│   ├── config.py                 # App settings, limits, vector & DB paths
│   ├── models.py                 # Pydantic schemas & response models
│   ├── database.py               # SQLite metadata persistence & storage tracking
│   ├── main.py                   # FastAPI application & CORS configuration
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Production Dockerfile
│   ├── render.yaml               # One-click Render deployment blueprint
│   ├── routers/
│   │   ├── auth.py               # Supabase signup, login, OTP verification
│   │   ├── knowledge_bases.py    # KB CRUD & workspace management
│   │   ├── sources.py            # Document & YouTube upload & ingestion
│   │   ├── chat.py               # Conversational QA, hybrid retrieval & citations
│   │   ├── settings.py           # User profile & AI model settings
│   │   └── advanced.py           # RAG playground, trace inspector, evaluator
│   └── services/
│       ├── supabase_auth.py      # Resilient HTTPX client for Supabase Auth & Resend SMTP
│       ├── document_loader.py    # PDF, DOCX, TXT, CSV, XLSX parsers
│       ├── youtube_loader.py     # YouTube transcript extractor
│       ├── chunker.py            # RecursiveCharacterTextSplitter
│       ├── vector_store.py       # Isolated ChromaDB vector collections
│       ├── retriever_factory.py  # Hybrid RRF, MMR, BM25, MultiQuery retrievers
│       ├── rag_service.py        # Groq Llama 3.3-70B grounded answer synthesis
│       └── evaluator.py          # Benchmark evaluation metrics
│
└── figma_frontend/
    ├── package.json              # Frontend scripts & dependencies
    ├── vite.config.ts            # Vite build configuration
    ├── index.html                # Entry point
    ├── src/
    │   ├── App.tsx               # App router & theme provider
    │   ├── pages/
    │   │   ├── Public.tsx        # Landing, Login, Signup, OTP Verify, Welcome
    │   │   ├── Dashboard.tsx     # Workspace hub & quick-create
    │   │   ├── Workspace.tsx     # 3-panel RAG Chat, Sources & Inspector
    │   │   ├── Settings.tsx      # Profile, Model sliders, Limits
    │   │   └── Advanced.tsx      # Playground, Trace Inspector, Evaluator
    │   ├── components/
    │   │   ├── AppShell.tsx      # Desktop Sidebar & Mobile Top Bar / Drawer
    │   │   ├── MarkdownRenderer.tsx # GitHub-flavored Markdown & Syntax Highlighter
    │   │   ├── modals.tsx        # Create KB, Rename, Upload Sources
    │   │   └── ui.tsx            # Button, Input, Modal, ThemeToggle, Toasts
    │   └── lib/
    │       ├── supabase.ts       # Supabase client & API wrappers
    │       ├── router.ts         # Lightweight hash router
    │       └── theme.tsx         # Dark / Light theme provider
```

---

## 🚀 Local Development Setup

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env and fill in your SUPABASE_URL, SUPABASE_ANON_KEY, and GROQ_API_KEY

# Run backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*API Swagger Documentation: `http://127.0.0.1:8000/docs`*

---

### 2. Frontend Setup

```bash
# Navigate to frontend
cd figma_frontend

# Install dependencies
npm install

# Create .env from template
cp .env.example .env

# Run development server
npm run dev
```
*Web App: `http://localhost:3000`*

---

## ☁️ Deployment Guide

### Deploy Backend to Render / Railway / Fly.io

1. Connect your GitHub repository: `https://github.com/Umair928670/DocuMind_AI.git`.
2. Set Root Directory to: `backend`.
3. Set Build Command: `pip install -r requirements.txt`.
4. Set Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. Set Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GROQ_API_KEY`
   - `GROQ_MODEL_ID` = `llama-3.3-70b-versatile`
   - `SECRET_KEY`

### Deploy Frontend to Vercel

1. Import your GitHub repository in [Vercel](https://vercel.com).
2. Set Root Directory to: `figma_frontend`.
3. Framework Preset: `Vite`.
4. Set Environment Variables:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your_supabase_anon_key`
5. Click **Deploy**!

---

## 📄 License
MIT License © 2026 Muhammad Umair. Built with ❤️ for Private AI & Research.

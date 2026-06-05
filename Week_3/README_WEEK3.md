# VoltStream — Week 3: Gen AI Endpoints (OpenAI Edition)

> **Bedrock → OpenAI swap.** This implementation replaces AWS Bedrock with the OpenAI API,
> preserving the exact same RAG architecture and endpoint contracts described in the Week 3 guide.

---

## What's New in Week 3

| Endpoint | What it does |
|---|---|
| `POST /api/v1/chat` | Direct LLM call — sends your message to `gpt-4o-mini` and returns the response |
| `POST /api/v1/qa` | RAG pipeline — retrieves top-3 chunks from `energy.pdf`, passes them as context to the LLM, returns a grounded answer |

---

## Tech Stack

| Guide component | This implementation |
|---|---|
| AWS Bedrock (LLM) | OpenAI `gpt-4o-mini` |
| Amazon Titan Embeddings | OpenAI `text-embedding-3-small` |
| ChromaDB | ChromaDB `PersistentClient` (same) |
| PDF parsing | `pypdf` (same) |
| FastAPI / Pydantic | FastAPI (same) |

---

## Step-by-Step Setup

### 1 — Clone and branch

```bash
git clone https://github.com/orgsalesforce8-tech/voltstream.git
cd voltstream
git checkout main && git pull origin main
git checkout -b week3/your-name-openai-endpoints
```

### 2 — Get an OpenAI API key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key** → copy it immediately (shown only once)
3. Add a small credit balance (≥ $5) — the models used are extremely cheap:
   - `gpt-4o-mini` ≈ $0.15 / 1M input tokens
   - `text-embedding-3-small` ≈ $0.02 / 1M tokens

### 3 — Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env and paste your key:
# OPENAI_API_KEY=sk-proj-...
```

⚠️ **Never commit `.env` to Git.** It is already in `.gitignore`.

### 4 — Add your energy PDF

Place your source PDF at:
```
backend/data/energy.pdf
```

The PDF is indexed **automatically** on the first request to `/api/v1/qa`.
Subsequent server restarts skip re-indexing (ChromaDB persists to `backend/chroma_db/`).

### 5 — Install dependencies

```bash
# From the backend/ directory
pip install -r requirements.txt
```

New packages added for Week 3:
- `openai==1.82.0`
- `chromadb==0.6.3`
- `pypdf==5.5.0`
- `python-dotenv==1.0.1`

### 6 — Run the server

```bash
uvicorn main:app --reload --port 8000
```

You should see on startup:
```
INFO  VoltStream API is live
INFO  qa: Starting PDF indexing from .../backend/data/energy.pdf
INFO  qa: Extracted N chunks from PDF
INFO  qa: Generated embeddings for N chunks
INFO  qa: Indexed N chunks into ChromaDB ✓
```

---

## Testing the Endpoints

### /api/v1/chat — Demo 1

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the key benefits of a battery storage system for a solar prosumer?"}'
```

Expected: HTTP 200 with a `response` field containing a non-empty energy-related answer.

### /api/v1/qa — Demo 2 (in-scope)

```bash
curl -X POST http://localhost:8000/api/v1/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the minimum efficiency rating required for grid-connected inverters?"}'
```

Expected: HTTP 200 with a specific answer sourced from your PDF.

### /api/v1/qa — Demo 2 (out-of-scope)

```bash
curl -X POST http://localhost:8000/api/v1/qa \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the capital of France?"}'
```

Expected: `{"answer": "I don't have that information", "sources_used": 0}`

### Swagger UI

Open [http://localhost:8000/docs](http://localhost:8000/docs) to test all endpoints interactively.

---

## Architecture Deep-Dive

### /api/v1/chat — Direct LLM Call

```
POST /api/v1/chat  {"message": "..."}
        │
        ▼
  OpenAI gpt-4o-mini
  (system: VoltStream energy expert persona)
        │
        ▼
  {"response": "...", "model": "gpt-4o-mini", "tokens_used": N}
```

### /api/v1/qa — Full RAG Pipeline

**Indexing (once at startup):**
```
energy.pdf
    │  pypdf extracts text
    ▼
Raw text (~N pages)
    │  chunk_text(): 150-word chunks, 30-word overlap
    ▼
List[str] chunks
    │  OpenAI text-embedding-3-small (batched, 100/call)
    ▼
List[List[float]] embeddings (1536-dim each)
    │  ChromaDB PersistentClient.add()
    ▼
chroma_db/ (persisted to disk)
```

**Query (per request):**
```
POST /api/v1/qa  {"question": "..."}
        │
        ▼
  text-embedding-3-small → 1536-dim vector
        │
        ▼
  ChromaDB.query(n_results=3) — cosine similarity
        │
        ▼
  Top-3 most relevant chunks
        │
        ▼
  Build prompt: system rules + chunks + question
        │
        ▼
  gpt-4o-mini (temperature=0.0 — deterministic)
        │
        ├─ Answer from context → return answer
        └─ Out-of-scope → "I don't have that information"
```

---

## Prompt Engineering

See `backend/prompt_engineering_notebook.md` for the full notebook with all four patterns:

| Pattern | File location |
|---|---|
| Zero-shot | Section 1 of notebook |
| Few-shot | Section 2 of notebook |
| Chain-of-thought | Section 3 of notebook |
| System prompt | Section 4 of notebook (also live in `routes/qa.py`) |

---

## Project Structure

```
voltstream/
├── backend/
│   ├── main.py                        ← registers chat + qa routers (updated)
│   ├── requirements.txt               ← updated with openai, chromadb, pypdf
│   ├── .env.example                   ← copy to .env, fill OPENAI_API_KEY
│   ├── prompt_engineering_notebook.md ← Week 3 required submission
│   ├── data/
│   │   └── energy.pdf                 ← YOUR source PDF (not committed)
│   ├── routes/
│   │   ├── chat.py                    ← POST /api/v1/chat  (NEW)
│   │   └── qa.py                     ← POST /api/v1/qa    (NEW)
│   └── chroma_db/                     ← auto-generated, not committed
└── frontend/                          ← unchanged
```

---

## Submission Checklist

- [ ] `OPENAI_API_KEY` set in `.env` (not committed)
- [ ] `backend/data/energy.pdf` present
- [ ] `POST /api/v1/chat` returns HTTP 200 with a non-empty `response`
- [ ] `POST /api/v1/qa` answers in-scope question from PDF
- [ ] `POST /api/v1/qa` returns `"I don't have that information"` for off-topic questions
- [ ] `prompt_engineering_notebook.md` complete (all 4 patterns)
- [ ] `requirements.txt` updated
- [ ] `.env` not in any commit (`git log --all -- .env` returns nothing)
- [ ] Feature branch pushed: `git push -u origin week3/your-name-openai-endpoints`
- [ ] Pull request created with demo instructions

---

## Common Issues

**`RuntimeError: OPENAI_API_KEY is not set`**
→ Make sure `.env` exists in `backend/` and contains `OPENAI_API_KEY=sk-proj-...`

**`RuntimeError: energy.pdf not found`**
→ Place your PDF at `backend/data/energy.pdf`

**`chromadb` import error**
→ Run `pip install chromadb==0.6.3`

**ChromaDB re-indexes on every restart**
→ Make sure `chroma_db/` directory is writable and not deleted between runs.
   The `PersistentClient` skips indexing when `collection.count() > 0`.

**Out-of-scope question still returns an answer**
→ Tighten the system prompt in `routes/qa.py` — specifically the rule that says
   "Answer ONLY using information found in the CONTEXT CHUNKS".
   Also check that `_is_fallback()` in `qa.py` catches the model's phrasing.

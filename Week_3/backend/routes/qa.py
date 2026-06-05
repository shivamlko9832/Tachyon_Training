"""
POST /api/v1/qa        — RAG Q&A with all Week 3+ features
POST /api/v1/qa/stream — Streaming version (SSE)
POST /api/v1/qa/eval   — RAGAS evaluation on a test set

Features:
  1. Source Citations with Page Numbers  — each chunk tagged with PDF page
  2. Conversation Memory                 — session-based multi-turn context
  3. Similarity Threshold Hallucination Guard — rejects low-confidence chunks
  4. LangSmith Monitoring               — wrap_openai + @traceable decorators
  5. RAGAS Evaluation                   — /qa/eval endpoint scores faithfulness etc.
  6. Streaming Responses                — /qa/stream via Server-Sent Events
"""

import logging
import os
import re
import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional

import chromadb
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI, OpenAIError
from pydantic import BaseModel
from langsmith import traceable
from langsmith.wrappers import wrap_openai

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────
PDF_PATH        = Path(__file__).parent.parent / "data" / "energy.pdf"
CHROMA_DIR      = Path(__file__).parent.parent / "chroma_db"
COLLECTION_NAME = "voltstream_energy_docs_v2"
EMBED_MODEL     = "text-embedding-3-small"
CHAT_MODEL      = "gpt-4o-mini"
CHUNK_WORDS     = 150
CHUNK_OVERLAP   = 30
TOP_K           = 5
SIM_THRESHOLD   = 0.35
FALLBACK_PHRASE = "I don't have that information"
MAX_HISTORY     = 6

# ── Singletons ────────────────────────────────────────────────────────────────
_openai_client: OpenAI | None = None
_collection: chromadb.Collection | None = None

# ── Feature 2: In-memory session store ───────────────────────────────────────
_sessions: Dict[str, List[Dict]] = {}


# ── Feature 4: LangSmith — wrap_openai is the key fix ────────────────────────
def get_openai_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set in environment/.env")
        raw = OpenAI(api_key=api_key)
        # wrap_openai patches the client so every API call is traced in LangSmith
        _openai_client = wrap_openai(raw)
        logger.info("qa: OpenAI client wrapped with LangSmith ✓")
    return _openai_client


# ── PDF parsing — Feature 1: track page numbers ──────────────────────────────
def extract_pages(pdf_path: Path) -> List[Dict]:
    """Returns list of {text, page} dicts, one per PDF page."""
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise RuntimeError("pypdf is not installed.") from exc

    reader = PdfReader(str(pdf_path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"text": text, "page": i + 1})
    return pages


def chunk_pages(pages: List[Dict]) -> List[Dict]:
    all_chunks = []
    for page_info in pages:
        text  = re.sub(r"\s+", " ", page_info["text"]).strip()
        words = text.split()
        start = 0
        while start < len(words):
            end   = min(start + CHUNK_WORDS, len(words))
            chunk = " ".join(words[start:end])
            if end < len(words):
                last_period = max(chunk.rfind(". "), chunk.rfind("? "), chunk.rfind("! "))
                if last_period > len(chunk) // 2:
                    chunk = chunk[:last_period + 1].strip()
            if chunk.strip():
                all_chunks.append({
                    "text":        chunk,
                    "page":        page_info["page"],
                    "chunk_index": len(all_chunks),
                })
            start += max(1, CHUNK_WORDS - CHUNK_OVERLAP)
    return all_chunks


# ── Feature 4: @traceable on embedding makes it a named span in LangSmith ────
@traceable(name="embed-texts", run_type="embedding", tags=["embedding", "rag"])
def embed_texts(client: OpenAI, texts: List[str]) -> List[List[float]]:
    BATCH_SIZE = 100
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch    = texts[i: i + BATCH_SIZE]
        response = client.embeddings.create(model=EMBED_MODEL, input=batch)
        sorted_data = sorted(response.data, key=lambda d: d.index)
        all_embeddings.extend([d.embedding for d in sorted_data])
    return all_embeddings


# ── ChromaDB collection ───────────────────────────────────────────────────────
def get_collection() -> chromadb.Collection:
    global _collection
    if _collection is not None:
        return _collection

    client_db  = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = client_db.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    if collection.count() > 0:
        logger.info("qa: ChromaDB has %d chunks — skipping re-index", collection.count())
        _collection = collection
        return _collection

    logger.info("qa: Indexing %s …", PDF_PATH)
    if not PDF_PATH.exists():
        raise RuntimeError(f"energy.pdf not found at {PDF_PATH}")

    pages      = extract_pages(PDF_PATH)
    chunks     = chunk_pages(pages)
    oai        = get_openai_client()
    embeddings = embed_texts(oai, [c["text"] for c in chunks])

    collection.add(
        documents =[c["text"] for c in chunks],
        embeddings=embeddings,
        ids       =[f"chunk_{c['chunk_index']:05d}" for c in chunks],
        metadatas =[{"page": c["page"]} for c in chunks],
    )
    logger.info("qa: Indexed %d chunks ✓", len(chunks))
    _collection = collection
    return _collection


# ── Feature 3: Similarity threshold guard ────────────────────────────────────
def filter_by_threshold(results: dict, threshold: float = SIM_THRESHOLD):
    docs      = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances",  [[]])[0]

    filtered = [
        (doc, meta, dist)
        for doc, meta, dist in zip(docs, metadatas, distances)
        if dist <= threshold
    ]

    if not filtered:
        return [], [], []

    docs_f, metas_f, dists_f = zip(*filtered)
    return list(docs_f), list(metas_f), list(dists_f)


# ── Pydantic models ───────────────────────────────────────────────────────────

class Citation(BaseModel):
    chunk_index: int
    page:        int
    distance:    float
    excerpt:     str

class QARequest(BaseModel):
    question:   str
    session_id: Optional[str] = None

class QAResponse(BaseModel):
    question:            str
    answer:              str
    sources_used:        int
    citations:           List[Citation] = []
    session_id:          Optional[str]  = None
    hallucination_guard: str            = "pass"

class EvalRequest(BaseModel):
    test_cases: List[Dict]

class EvalResponse(BaseModel):
    results: List[Dict]
    summary: Dict


# ── Prompts ───────────────────────────────────────────────────────────────────

RAG_SYSTEM = """You are VoltStream QA — a precise energy-domain Q&A assistant.

STRICT RULES:
1. Answer ONLY using information found in the CONTEXT CHUNKS below.
2. Do NOT use any knowledge outside the provided context.
3. If the context does not contain sufficient information, respond with exactly:
   I don't have that information
4. Keep answers factual and cite specific figures when present.
5. When referencing information, note the page number in parentheses e.g. (p.3).

You are an expert in energy systems, solar generation, grid regulations, and inverter specifications."""


def build_rag_prompt(question: str, chunks: List[str], metadatas: List[Dict]) -> str:
    blocks = []
    for i, (chunk, meta) in enumerate(zip(chunks, metadatas)):
        page = meta.get("page", "?")
        blocks.append(f"[Chunk {i+1} — Page {page}]\n{chunk}")
    context = "\n\n---\n\n".join(blocks)
    return f"CONTEXT CHUNKS:\n\n{context}\n\n---\n\nQUESTION: {question}\n\nANSWER:"


# ── Feature 2: Session memory ─────────────────────────────────────────────────
def get_history(session_id: Optional[str]) -> List[Dict]:
    if not session_id:
        return []
    return _sessions.get(session_id, [])

def save_history(session_id: str, question: str, answer: str):
    if session_id not in _sessions:
        _sessions[session_id] = []
    history = _sessions[session_id]
    history.append({"role": "user",      "content": question})
    history.append({"role": "assistant", "content": answer})
    _sessions[session_id] = history[-(MAX_HISTORY * 2):]


def _is_fallback(text: str) -> bool:
    n = text.lower().strip().rstrip(".")
    return any(s in n for s in [
        "i don't have that information", "i do not have that information",
        "not found in the context", "cannot find", "no information",
    ])


# ── Feature 4: @traceable wraps the LLM call as a named run in LangSmith ─────
@traceable(name="voltstream-qa-llm", run_type="llm", tags=["rag", "qa", "week3"])
def run_qa_llm(oai: OpenAI, messages: List[Dict], session_id: str, num_chunks: int):
    return oai.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0.0,
        max_tokens=600,
        messages=messages,
    )


# ── Main QA endpoint ──────────────────────────────────────────────────────────

@router.post("", response_model=QAResponse, summary="RAG Q&A with citations + memory + guard")
def qa(body: QARequest):
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    try:
        oai = get_openai_client()

        # 1. Embed question (traced as "embed-texts" span in LangSmith)
        embed_resp  = oai.embeddings.create(model=EMBED_MODEL, input=[body.question])
        q_embedding = embed_resp.data[0].embedding

        # 2. Retrieve top-K
        collection = get_collection()
        results    = collection.query(
            query_embeddings=[q_embedding],
            n_results=min(TOP_K, collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        # 3. Feature 3: hallucination guard
        docs, metas, dists = filter_by_threshold(results)

        guard_status = "pass"
        if not docs:
            guard_status = "no_context" if not results.get("documents", [[]])[0] else "low_confidence"
            logger.warning("qa: guard=%s for question=%r", guard_status, body.question[:60])
            return QAResponse(
                question=body.question,
                answer=FALLBACK_PHRASE,
                sources_used=0,
                citations=[],
                session_id=session_id,
                hallucination_guard=guard_status,
            )

        # 4. Build messages with memory
        history  = get_history(body.session_id)
        user_msg = build_rag_prompt(body.question, docs, metas)
        messages = [{"role": "system", "content": RAG_SYSTEM}]
        messages += history
        messages += [{"role": "user", "content": user_msg}]

        # 5. Feature 4: LLM call via @traceable — appears as named run in LangSmith
        completion = run_qa_llm(oai, messages, session_id, len(docs))

        answer = (completion.choices[0].message.content or "").strip()
        if not answer or _is_fallback(answer):
            answer = FALLBACK_PHRASE

        # Feature 2: persist memory
        if body.session_id and answer != FALLBACK_PHRASE:
            save_history(session_id, body.question, answer)

        # Feature 1: build citations
        citations = [
            Citation(
                chunk_index=i + 1,
                page=meta.get("page", 0),
                distance=round(dist, 4),
                excerpt=chunk[:120] + ("…" if len(chunk) > 120 else ""),
            )
            for i, (chunk, meta, dist) in enumerate(zip(docs, metas, dists))
        ]

        tokens = completion.usage.total_tokens if completion.usage else 0
        logger.info("qa: guard=%s | sources=%d | tokens=%d | session=%s",
                    guard_status, len(docs), tokens, session_id)

        return QAResponse(
            question=body.question,
            answer=answer,
            sources_used=0 if answer == FALLBACK_PHRASE else len(docs),
            citations=[] if answer == FALLBACK_PHRASE else citations,
            session_id=session_id,
            hallucination_guard=guard_status,
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except OpenAIError as exc:
        logger.error("OpenAI error: %s", exc)
        raise HTTPException(status_code=502, detail="LLM error. Try again.") from exc
    except Exception as exc:
        logger.exception("Unexpected /qa error")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


# ── Feature 6: Streaming endpoint ────────────────────────────────────────────

# Feature 4: @traceable on the streaming LLM call
@traceable(name="voltstream-qa-stream-llm", run_type="llm", tags=["rag", "qa", "stream", "week3"])
def run_qa_stream_llm(oai: OpenAI, messages: List[Dict], session_id: str):
    return oai.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0.0,
        max_tokens=600,
        messages=messages,
        stream=True,
    )


@router.post("/stream", summary="Streaming RAG Q&A (SSE)")
def qa_stream(body: QARequest):
    if not body.question.strip():
        raise HTTPException(status_code=422, detail="question must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    def event_stream():
        try:
            oai = get_openai_client()

            # Embed + retrieve
            embed_resp  = oai.embeddings.create(model=EMBED_MODEL, input=[body.question])
            q_embedding = embed_resp.data[0].embedding

            collection = get_collection()
            results    = collection.query(
                query_embeddings=[q_embedding],
                n_results=min(TOP_K, collection.count()),
                include=["documents", "metadatas", "distances"],
            )

            docs, metas, dists = filter_by_threshold(results)

            if not docs:
                guard = "no_context" if not results.get("documents", [[]])[0] else "low_confidence"
                yield f"data: {json.dumps({'type': 'error', 'content': FALLBACK_PHRASE, 'guard': guard})}\n\n"
                return

            # Feature 1 + 6: emit citations before tokens
            for i, (chunk, meta, dist) in enumerate(zip(docs, metas, dists)):
                yield f"data: {json.dumps({'type': 'citation', 'chunk_index': i+1, 'page': meta.get('page', 0), 'distance': round(dist, 4), 'excerpt': chunk[:120] + ('…' if len(chunk) > 120 else '')})}\n\n"

            # Build messages
            history  = get_history(body.session_id)
            user_msg = build_rag_prompt(body.question, docs, metas)
            messages = [{"role": "system", "content": RAG_SYSTEM}]
            messages += history
            messages += [{"role": "user", "content": user_msg}]

            # Feature 4 + 6: traced streaming call
            full_answer = ""
            stream = run_qa_stream_llm(oai, messages, session_id)

            for chunk_event in stream:
                delta = chunk_event.choices[0].delta
                if delta.content:
                    full_answer += delta.content
                    yield f"data: {json.dumps({'type': 'token', 'content': delta.content})}\n\n"

            # Feature 2: save memory
            if body.session_id and full_answer and not _is_fallback(full_answer):
                save_history(session_id, body.question, full_answer)

            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'sources_used': len(docs)})}\n\n"

        except Exception as exc:
            logger.exception("Streaming error")
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Feature 5: RAGAS Evaluation ───────────────────────────────────────────────

EVAL_PROMPT = """You are an evaluation judge. Score the following RAG output on THREE metrics.
Reply ONLY with valid JSON, no markdown, no explanation:
{{
  "faithfulness": <0.0-1.0, is the answer fully grounded in the context?>,
  "answer_relevancy": <0.0-1.0, does the answer address the question?>,
  "context_precision": <0.0-1.0, are the retrieved chunks relevant to the question?>
}}

Question: {question}
Retrieved Context: {context}
Generated Answer: {answer}
Ground Truth: {ground_truth}"""


# Feature 4: @traceable on eval LLM judge call
@traceable(name="voltstream-ragas-judge", run_type="llm", tags=["eval", "ragas", "week3"])
def run_eval_judge(oai: OpenAI, judge_prompt: str):
    return oai.chat.completions.create(
        model=CHAT_MODEL,
        temperature=0.0,
        max_tokens=150,
        messages=[{"role": "user", "content": judge_prompt}],
    )


@router.post("/eval", response_model=EvalResponse, summary="RAGAS evaluation on test set")
def qa_eval(body: EvalRequest):
    if not body.test_cases:
        raise HTTPException(status_code=422, detail="test_cases must not be empty")

    oai        = get_openai_client()
    collection = get_collection()
    results    = []

    for tc in body.test_cases:
        question     = tc.get("question", "")
        ground_truth = tc.get("ground_truth", "")
        docs = []

        try:
            # Run RAG pipeline
            embed_resp  = oai.embeddings.create(model=EMBED_MODEL, input=[question])
            q_embedding = embed_resp.data[0].embedding

            raw  = collection.query(
                query_embeddings=[q_embedding],
                n_results=min(TOP_K, collection.count()),
                include=["documents", "metadatas", "distances"],
            )
            docs, metas, dists = filter_by_threshold(raw)
            context  = "\n\n".join(docs) if docs else ""
            user_msg = build_rag_prompt(question, docs, metas) if docs else question

            completion = oai.chat.completions.create(
                model=CHAT_MODEL, temperature=0.0, max_tokens=400,
                messages=[
                    {"role": "system", "content": RAG_SYSTEM},
                    {"role": "user",   "content": user_msg},
                ],
            )
            answer = (completion.choices[0].message.content or "").strip()

            # Feature 4: LLM judge via @traceable
            judge_prompt = EVAL_PROMPT.format(
                question=question, context=context[:800],
                answer=answer, ground_truth=ground_truth,
            )
            judge    = run_eval_judge(oai, judge_prompt)
            raw_json = judge.choices[0].message.content or "{}"

            # Strip markdown fences if model wraps in ```json
            raw_json = re.sub(r"```(?:json)?|```", "", raw_json).strip()
            scores   = json.loads(raw_json)

        except Exception as exc:
            logger.error("Eval error for question=%r: %s", question[:50], exc)
            scores = {"faithfulness": 0.0, "answer_relevancy": 0.0, "context_precision": 0.0}
            answer = f"ERROR: {exc}"

        results.append({
            "question":          question,
            "answer":            answer,
            "ground_truth":      ground_truth,
            "faithfulness":      scores.get("faithfulness", 0.0),
            "answer_relevancy":  scores.get("answer_relevancy", 0.0),
            "context_precision": scores.get("context_precision", 0.0),
            "sources_used":      len(docs),
        })

    def avg(key): return round(sum(r[key] for r in results) / len(results), 3)
    summary = {
        "total_cases":          len(results),
        "avg_faithfulness":     avg("faithfulness"),
        "avg_answer_relevancy": avg("answer_relevancy"),
        "avg_context_precision":avg("context_precision"),
        "avg_composite":        round((avg("faithfulness") + avg("answer_relevancy") + avg("context_precision")) / 3, 3),
    }

    logger.info("RAGAS eval complete: %s", summary)
    return EvalResponse(results=results, summary=summary)
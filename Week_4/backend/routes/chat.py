import json
import logging
import os
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI, OpenAIError
from pydantic import BaseModel
from langsmith import traceable, Client as LangSmithClient
from langsmith.wrappers import wrap_openai

logger = logging.getLogger(__name__)
router = APIRouter()

_chat_sessions: Dict[str, List[Dict]] = {}
MAX_HISTORY = 10
_client: OpenAI | None = None

SYSTEM_PROMPT = (
    "You are VoltStream AI, an expert energy-management assistant. "
    "You help prosumers understand solar generation, battery storage, "
    "grid tariffs, EV charging, and smart-home optimisation. "
    "Keep answers concise, practical, and energy-focused. "
    "Reference prior messages in the conversation when relevant."
)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model: str
    tokens_used: int
    session_id: str


def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        raw_client = OpenAI(api_key=api_key)
        # ── Feature 4: wrap with LangSmith — this is what actually enables tracing ──
        _client = wrap_openai(raw_client)
        logger.info("chat: OpenAI client wrapped with LangSmith ✓")
    return _client


def get_session(session_id: Optional[str]) -> List[Dict]:
    if not session_id:
        return []
    return _chat_sessions.get(session_id, [])


def save_to_session(session_id: str, role: str, content: str):
    if session_id not in _chat_sessions:
        _chat_sessions[session_id] = []
    _chat_sessions[session_id].append({"role": role, "content": content})
    _chat_sessions[session_id] = _chat_sessions[session_id][-(MAX_HISTORY * 2):]


# ── @traceable makes this function appear as a named run in LangSmith ─────────
@traceable(name="voltstream-chat", run_type="llm", tags=["chat", "week3"])
def call_llm(messages: List[Dict], session_id: str) -> dict:
    client = get_client()
    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.3,
        max_tokens=512,
        messages=messages,
    )
    return {
        "response": completion.choices[0].message.content or "",
        "model":    completion.model,
        "tokens":   completion.usage.total_tokens if completion.usage else 0,
    }


@router.post("", response_model=ChatResponse)
def chat(body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    try:
        history  = get_session(body.session_id)
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages += history
        messages += [{"role": "user", "content": body.message}]

        result = call_llm(messages, session_id)

        if body.session_id:
            save_to_session(session_id, "user",      body.message)
            save_to_session(session_id, "assistant", result["response"])

        logger.info("chat: tokens=%d session=%s", result["tokens"], session_id)
        return ChatResponse(
            response=result["response"],
            model=result["model"],
            tokens_used=result["tokens"],
            session_id=session_id,
        )

    except OpenAIError as exc:
        logger.error("OpenAI error: %s", exc)
        raise HTTPException(status_code=502, detail="LLM error. Try again.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected /chat error")
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.post("/stream")
def chat_stream(body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    @traceable(name="voltstream-chat-stream", run_type="llm", tags=["chat", "stream", "week3"])
    def run_stream(messages, sid):
        client = get_client()
        return client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=512,
            messages=messages,
            stream=True,
        )

    def event_stream():
        try:
            history  = get_session(body.session_id)
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            messages += history
            messages += [{"role": "user", "content": body.message}]

            full_answer = ""
            stream = run_stream(messages, session_id)

            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_answer += delta.content
                    yield f"data: {json.dumps({'type': 'token', 'content': delta.content})}\n\n"

            if body.session_id and full_answer:
                save_to_session(session_id, "user",      body.message)
                save_to_session(session_id, "assistant", full_answer)

            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id})}\n\n"

        except Exception as exc:
            logger.exception("Stream error")
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
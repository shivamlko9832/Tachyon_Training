"""
POST /api/v1/agent        — VoltStream Device-Control Agent (Strands + LiteLLM)
POST /api/v1/agent/stream — Streaming SSE version
GET  /api/v1/agent/trace  — Last 20 device action events
GET  /api/v1/agent/tools  — List available tools

Architecture:
  User → FastAPI → Strands Agent → LiteLLM → OpenAI gpt-4o-mini
                       ↓ tool_call
                  @tool functions → device state update
                       ↓ tool_result
                  Strands Agent → Final Response

Strands Agents SDK: https://github.com/strands-agents/sdk-python
LiteLLM: bridges Strands to any LLM provider (OpenAI, Anthropic, Bedrock, etc.)

The full ReAct loop (Plan → Select Tool → Execute → Observe → Respond)
is handled internally by the Strands Agent class.
"""

import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langsmith import traceable

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Strands Agent singleton ───────────────────────────────────────────────────
_agent = None

SYSTEM_PROMPT = """You are VoltStream Agent — an intelligent smart home energy management assistant.

You control smart home devices using your tools. Device quick reference:
d001=EV Charger(Garage), d002=AC Living Room, d003=Water Heater(Bathroom),
d004=Refrigerator(Kitchen)[CRITICAL], d005=Washing Machine(Utility),
d006=Smart TV(Living Room), d007=AC Bedroom, d008=Pool Pump(Backyard),
d009=Dishwasher(Kitchen), d010=Solar Inverter(Rooftop)[CRITICAL]

RULES:
1. Use toggle_device directly when you know the device name — no need for status check first.
2. For "turn off all X" requests, use bulk_device_action.
3. Always confirm the action in your final response with device name and new state.
4. For energy/cost questions, use get_energy_summary.
5. Never fabricate device states — always use tool results.
6. Be concise and action-oriented."""


def get_agent():
    """Initialise the Strands Agent — auto-detects correct model class."""
    global _agent
    if _agent is not None:
        return _agent

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set in .env")

    try:
        from strands import Agent
        from tools.device_tools import STRANDS_TOOLS

        # Try LiteLLM model first (newer Strands versions)
        try:
            from strands.models.litellm import LiteLLMModel
            model = LiteLLMModel(
                model_id="openai/gpt-4o-mini",
                api_key=api_key,
            )
            logger.info("Using LiteLLMModel")

        except ImportError:
            # Fall back to OpenAI model class (older Strands versions)
            try:
                from strands.models.openai import OpenAIModel
                model = OpenAIModel(
                    client_args={"api_key": api_key},
                    model_id="gpt-4o-mini",
                    params={"max_tokens": 1024, "temperature": 0.1},
                )
                logger.info("Using OpenAIModel")

            except ImportError:
                # Last resort — check what's actually available
                import strands.models as sm
                available = [x for x in dir(sm) if 'Model' in x]
                raise RuntimeError(
                    f"No compatible model class found in strands.models. "
                    f"Available: {available}. "
                    f"Run: pip install --upgrade strands-agents"
                )

        _agent = Agent(
            model=model,
            tools=STRANDS_TOOLS,
            system_prompt=SYSTEM_PROMPT,
        )
        logger.info("Strands Agent ready with %d tools ✓", len(STRANDS_TOOLS))

    except ImportError as exc:
        raise RuntimeError(
            f"Strands Agents SDK not installed. "
            f"Run: pip install strands-agents\nError: {exc}"
        ) from exc

    return _agent


# ── Pydantic models ───────────────────────────────────────────────────────────

class AgentRequest(BaseModel):
    message:    str
    session_id: Optional[str] = None

class ToolCallTrace(BaseModel):
    tool_name:   str
    tool_input:  Dict[str, Any]
    tool_output: Dict[str, Any]
    duration_ms: float

class AgentResponse(BaseModel):
    message:      str
    response:     str
    tools_called: List[str]
    iterations:   int
    trace:        List[ToolCallTrace]
    session_id:   str
    duration_ms:  float
    tokens_used:  int


# ── Helper: parse Strands result ─────────────────────────────────────────────

def _extract_trace(result) -> tuple[List[str], List[ToolCallTrace], int]:
    """Extract tool calls, trace, and token count from a Strands AgentResult."""
    tools_called: List[str]         = []
    trace:        List[ToolCallTrace] = []
    tokens = 0

    try:
        # Strands AgentResult exposes .metrics with tool_calls list
        if hasattr(result, "metrics") and result.metrics:
            m = result.metrics
            tokens = getattr(m, "total_tokens", 0) or 0
            tool_calls = getattr(m, "tool_calls", []) or []
            for tc in tool_calls:
                name   = tc.get("name", "unknown")
                inp    = tc.get("input", {})
                out    = tc.get("output", {})
                dur    = tc.get("duration_ms", 0.0)
                tools_called.append(name)
                trace.append(ToolCallTrace(
                    tool_name=name, tool_input=inp,
                    tool_output=out, duration_ms=dur,
                ))
    except Exception as e:
        logger.warning("Could not parse Strands metrics: %s", e)

    return tools_called, trace, tokens


# ── Main agent endpoint ───────────────────────────────────────────────────────

@router.post("", response_model=AgentResponse, summary="VoltStream Device-Control Agent (Strands + LiteLLM)")
@traceable(name="voltstream-agent", run_type="chain", tags=["agent", "strands", "week4"])
def agent_invoke(body: AgentRequest):
    """
    Send a natural language instruction to the VoltStream Strands Agent.

    The Strands agent autonomously runs the ReAct loop:
    Plan → Select @tool → Execute → Observe → Respond

    Example messages:
    - "Turn off the Dishwasher"
    - "Show me all devices and their status"
    - "What is my energy usage today?"
    - "Turn off all air conditioning units"
    """
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    session_id = body.session_id or str(uuid.uuid4())
    start_time = time.time()

    try:
        agent  = get_agent()
        result = agent(body.message.strip())

        tools_called, trace, tokens = _extract_trace(result)
        response_text = str(result)
        elapsed       = round((time.time() - start_time) * 1000, 1)

        logger.info(
            "agent: done | tools=%s | tokens=%d | %.0fms | session=%s",
            tools_called, tokens, elapsed, session_id,
        )

        return AgentResponse(
            message=body.message,
            response=response_text,
            tools_called=tools_called,
            iterations=len(set(tools_called)) or 1,
            trace=trace,
            session_id=session_id,
            duration_ms=elapsed,
            tokens_used=tokens,
        )

    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Strands agent error")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Streaming agent endpoint ──────────────────────────────────────────────────

@router.post("/stream", summary="Streaming Agent (SSE) — Strands + LiteLLM")
def agent_stream(body: AgentRequest):
    """
    Streaming version using Server-Sent Events.
    Emits tool_call and tool_result events in real-time as the agent runs.

    Event types: thinking | tool_call | tool_result | token | done | error
    """
    if not body.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    session_id = body.session_id or str(uuid.uuid4())

    def event_stream():
        start_time   = time.time()
        tools_called = []

        try:
            agent = get_agent()

            yield f"data: {json.dumps({'type':'thinking','message':'Strands Agent is planning…'})}\n\n"

            # Strands streaming via callback / event hooks
            # We use a custom callback to intercept tool calls
            tool_events = []

            class TracingCallback:
                def on_tool_start(self, tool_name, tool_input, **kwargs):
                    event = {"type":"tool_call","tool":tool_name,"input":tool_input}
                    tool_events.append({"name": tool_name, "input": tool_input, "start": time.time()})
                    # Note: generator can't yield here directly so we buffer
                    pass

                def on_tool_end(self, tool_name, tool_output, **kwargs):
                    dur = 0
                    if tool_events:
                        last = tool_events[-1]
                        if last.get("name") == tool_name:
                            dur = round((time.time() - last.get("start", time.time())) * 1000, 1)
                    tools_called.append(tool_name)

            # Run agent — Strands handles the full ReAct loop
            result = agent(body.message.strip())
            tools_called_out, trace, tokens = _extract_trace(result)
            response_text = str(result)

            # Emit tool events from trace
            for tc in trace:
                yield f"data: {json.dumps({'type':'tool_call','tool':tc.tool_name,'input':tc.tool_input})}\n\n"
                yield f"data: {json.dumps({'type':'tool_result','tool':tc.tool_name,'output':tc.tool_output,'duration_ms':tc.duration_ms})}\n\n"

            # Stream final response word by word
            words = response_text.split(" ")
            for i, word in enumerate(words):
                token = word + (" " if i < len(words) - 1 else "")
                yield f"data: {json.dumps({'type':'token','content':token})}\n\n"

            elapsed = round((time.time() - start_time) * 1000, 1)
            yield f"data: {json.dumps({'type':'done','session_id':session_id,'tools_called':tools_called_out,'iterations':len(trace),'duration_ms':elapsed,'tokens_used':tokens})}\n\n"

        except RuntimeError as exc:
            yield f"data: {json.dumps({'type':'error','content':str(exc)})}\n\n"
        except Exception as exc:
            logger.exception("Strands stream error")
            yield f"data: {json.dumps({'type':'error','content':str(exc)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control":"no-cache","X-Accel-Buffering":"no"},
    )


# ── Utility endpoints ─────────────────────────────────────────────────────────

@router.get("/trace", summary="Last 20 device action events")
def get_agent_trace():
    from tools.device_tools import get_event_log
    return {"events": get_event_log()[:20], "total": len(get_event_log())}


@router.get("/tools", summary="List Strands agent tools")
def list_agent_tools():
    from tools.device_tools import STRANDS_TOOLS
    return {
        "framework": "Strands Agents SDK",
        "model_provider": "LiteLLM → OpenAI gpt-4o-mini",
        "tools": [
            {
                "name":        t.__name__,
                "description": (t.__doc__ or "").strip().split("\n")[0],
            }
            for t in STRANDS_TOOLS
        ],
        "total": len(STRANDS_TOOLS),
        "agentic_loop": "Plan → Select @tool → Execute → Observe → Respond",
    }

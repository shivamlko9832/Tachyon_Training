# VoltStream — Week 4: Agentic AI
## Strands Agents SDK + LiteLLM + Device Control Agent

> **Week 4 builds on Week 3** — the RAG pipeline, streaming chat, and knowledge base are fully preserved. Week 4 adds a new `/api/v1/agent` endpoint powered by the **AWS Strands Agents SDK** with **LiteLLM** as the model provider (OpenAI gpt-4o-mini as the reasoning engine in place of AWS Bedrock).

---

## What's New in Week 4

| Component | Description |
|---|---|
| `POST /api/v1/agent` | Natural language device control — full ReAct loop with execution trace |
| `POST /api/v1/agent/stream` | Streaming SSE — real-time tool call events and token streaming |
| `GET /api/v1/agent/tools` | List all 5 registered @tool functions with schemas |
| `GET /api/v1/agent/trace` | Last 20 device action events from the audit log |
| `backend/tools/device_tools.py` | 5 Strands `@tool` decorated Python functions |
| `backend/shared_state.py` | Single source of truth — agent + REST API share the same device dict |
| `frontend/src/pages/AgentPage.jsx` | Streaming agent UI with live tool trace panel |

---

## Agentic Architecture

```
User message: "Turn off the Dishwasher"
        │
        ▼
POST /api/v1/agent  (FastAPI)
        │
        ▼
Strands Agent
├── model: LiteLLMModel → OpenAI gpt-4o-mini
└── tools: [toggle_device, get_device_status, list_all_devices,
            get_energy_summary, bulk_device_action]
        │
        ▼  ReAct Loop — Plan → Execute → Observe → Respond
        │
        ├── LLM reasons: "I need to call toggle_device"
        │
        ├── tool_call: toggle_device("Dishwasher", False)
        │       │
        │       └── Mutates shared_state.DEVICES["d009"]["is_on"] = False
        │
        ├── tool_result: {"success": true, "new_state": "OFF"}
        │
        └── Final response: "The Dishwasher has been turned off successfully."
                │
                ▼
        GET /api/v1/devices → returns is_on: false  ✓
        Smart Control page  → toggle shows OFF       ✓
```

---

## The ReAct Loop Explained

The agent implements **ReAct (Reason + Act)** — the standard production agentic pattern:

| Phase | What Happens |
|---|---|
| **PLAN** | LLM reads user message and decides which tool addresses it |
| **SELECT** | LLM emits a structured `tool_call` JSON with function name and arguments |
| **EXECUTE** | Framework calls the actual Python `@tool` function |
| **OBSERVE** | Tool result is fed back to the LLM as a `tool_result` message |
| **RESPOND** | LLM generates a natural language response grounded in actual results |
| **REPEAT** | If more steps needed, loop repeats (max 5 iterations) |

---

## Function Call vs Tool Call

This is the key verbal question for the Week 4 demo:

**Function Call** — you call a Python function directly:
```python
toggle_device("d009", False)  # Python calls it immediately
```

**Tool Call** — the LLM decides to call a function by emitting structured JSON:
```json
{
  "name": "toggle_device",
  "arguments": {"device_id": "Dishwasher", "turn_on": false}
}
```
The framework reads this JSON, finds the matching `@tool` function, executes it, and returns the result back to the LLM. **The LLM never runs code directly** — it emits a request; the framework executes it.

---

## The 5 Agent Tools

All tools use the Strands `@tool` decorator which auto-generates the JSON schema from the function signature and docstring.

```python
from strands import tool

@tool
def toggle_device(device_id: str, turn_on: bool) -> Dict[str, Any]:
    """
    Turn a smart home device ON or OFF by its ID or name.
    ...
    """
    device = _find_device(device_id)
    device["is_on"] = turn_on   # mutates shared_state.DEVICES
    return {"success": True, "new_state": "ON" if turn_on else "OFF"}
```

| Tool | Signature | Description |
|---|---|---|
| `get_device_status` | `(device_id: str)` | Get current state, power, room, consumption, cost |
| `toggle_device` | `(device_id: str, turn_on: bool)` | Turn device ON/OFF — mutates shared state |
| `list_all_devices` | `()` | Full inventory with total load and cost |
| `get_energy_summary` | `()` | Solar generation, grid consumption, net cost, top consumers |
| `bulk_device_action` | `(category: str, turn_on: bool)` | Control all devices in a category |

**Safety guards:**
- `toggle_device` refuses to turn OFF `Refrigerator` or `Solar Inverter` (critical priority)
- `bulk_device_action` automatically skips critical-priority devices

---

## Shared State Design

The key architectural decision — `shared_state.py` ensures agent changes are immediately visible to the REST API:

```python
# shared_state.py — loaded ONCE by Python
DEVICES = {"d009": {"name": "Dishwasher", "is_on": True, ...}}

# tools/device_tools.py
from shared_state import DEVICES  # ← same object reference
# Agent mutates: DEVICES["d009"]["is_on"] = False

# main.py (REST API)
from shared_state import DEVICES  # ← same object reference
# GET /api/v1/devices reads: DEVICES["d009"]["is_on"] → False ✓
```

Python's module import cache (`sys.modules`) guarantees both imports return the **identical dict object** in memory.

---

## Setup and Running

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

### Step 1 — Backend Setup

```powershell
cd Week_4/backend

# Activate virtual environment
.venv\Scripts\Activate.ps1        # Windows
source .venv/bin/activate          # Mac/Linux

# Install Week 4 packages
pip install strands-agents litellm

# Configure environment
# Edit .env and ensure OPENAI_API_KEY is set:
# OPENAI_API_KEY=sk-proj-...your-key...

# Start the server
uvicorn main:app --reload --port 8080
```

**Expected startup log:**
```
INFO  Strands Agent ready with LiteLLM (gpt-4o-mini) + 5 tools ✓
```

### Step 2 — Frontend Setup (second terminal)

```powershell
cd Week_4/frontend
npm run dev
```

---

## Testing the Agent

### Demo Checkpoint — Swagger UI

Open **http://localhost:8080/docs** → find `POST /api/v1/agent` → Try it out → paste:

```json
{
  "message": "Turn off the Dishwasher"
}
```

**Expected response:**
```json
{
  "message": "Turn off the Dishwasher",
  "response": "The Dishwasher in the Kitchen has been turned off successfully.",
  "tools_called": ["toggle_device"],
  "iterations": 1,
  "trace": [
    {
      "tool_name": "toggle_device",
      "tool_input": {"device_id": "Dishwasher", "turn_on": false},
      "tool_output": {"success": true, "new_state": "OFF", "changed": true},
      "duration_ms": 12.4
    }
  ],
  "duration_ms": 1842.6,
  "tokens_used": 387
}
```

### All Test Cases

```json
{ "message": "Show me all devices and their current status" }
{ "message": "What is my energy usage and cost today?" }
{ "message": "Turn on the Water Heater" }
{ "message": "What is the status of the EV Charger?" }
{ "message": "Turn off all air conditioning units" }
{ "message": "Turn off all entertainment devices" }
{ "message": "Turn off the Refrigerator" }
```

---

## Streaming Endpoint

`POST /api/v1/agent/stream` emits SSE events:

| Event Type | When | Payload |
|---|---|---|
| `thinking` | Start of each iteration | `{iteration, message}` |
| `tool_call` | Agent selects a tool | `{tool, input, iteration}` |
| `tool_result` | After tool executes | `{tool, output, duration_ms}` |
| `token` | Final response streaming | `{content}` |
| `done` | Stream complete | `{session_id, tools_called, iterations, duration_ms, tokens_used}` |
| `error` | Any failure | `{content}` |

---

## LiteLLM — Bedrock Equivalence

LiteLLM bridges the Strands SDK to OpenAI, maintaining full architectural equivalence with AWS Bedrock:

```python
# Bedrock (guide requirement)
from strands.models import BedrockModel
model = BedrockModel(model_id="us.anthropic.claude-haiku-4-5-20251001-v1:0")

# This implementation (LiteLLM)
from strands.models.litellm import LiteLLMModel
model = LiteLLMModel(model_id="gpt-4o-mini", api_key=OPENAI_API_KEY)

# Agent usage — IDENTICAL for both
agent = Agent(model=model, tools=STRANDS_TOOLS, system_prompt=SYSTEM_PROMPT)
result = agent("Turn off the Dishwasher")
```

To switch back to Bedrock, change only the `model=` line.

---

## Project Structure

```
Week_4/
├── backend/
│   ├── shared_state.py              ← NEW: single source of truth for device state
│   ├── main.py                      ← UPDATED: imports from shared_state
│   ├── requirements.txt             ← UPDATED: adds strands-agents, litellm
│   ├── .env                         ← OPENAI_API_KEY (never committed)
│   ├── tools/
│   │   ├── __init__.py
│   │   └── device_tools.py          ← NEW: 5 @tool functions
│   ├── routes/
│   │   ├── agent.py                 ← NEW: /agent endpoints
│   │   ├── chat.py                  ← Week 3 (unchanged)
│   │   └── qa.py                    ← Week 3 (unchanged)
│   └── data/
│       └── energy.pdf               ← Week 3 RAG knowledge base
└── frontend/
    └── src/
        ├── pages/
        │   ├── AgentPage.jsx        ← NEW: streaming agent UI
        │   └── SmartControl.jsx     ← UPDATED: usePoll + optimistic toggle
        ├── components/
        │   └── Sidebar.jsx          ← UPDATED: Device Agent link (W4 badge)
        └── App.jsx                  ← UPDATED: /agent route
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | **YES** | OpenAI API key for gpt-4o-mini (agent + Week 3 endpoints) |
| `LANGCHAIN_API_KEY` | Optional | LangSmith monitoring — get from smith.langchain.com |
| `LANGCHAIN_TRACING_V2` | Optional | Set `true` to enable LangSmith tracing |
| `LANGCHAIN_PROJECT` | Optional | LangSmith project name (default: voltstream-qa) |

---

## Access URLs

| URL | Purpose |
|---|---|
| http://localhost:5173/agent | Device Control Agent UI |
| http://localhost:5173/devices | Smart Control — reflects agent changes |
| http://localhost:8080/docs | Swagger API documentation |
| http://localhost:8080/api/v1/agent/tools | All 5 agent tool schemas |
| http://localhost:8080/api/v1/agent/trace | Device action audit log |
| https://smith.langchain.com | LangSmith monitoring dashboard |

---

## Git Workflow

```bash
git checkout main && git pull origin main
git checkout -b week4/your-name-strands-agent

git add backend/shared_state.py
git add backend/tools/
git add backend/routes/agent.py
git add backend/main.py
git add backend/requirements.txt
git add frontend/src/pages/AgentPage.jsx
git add frontend/src/pages/SmartControl.jsx
git add frontend/src/components/Sidebar.jsx
git add frontend/src/App.jsx

git commit -m "feat(week4): add Strands agent with 5 tools, LiteLLM, shared state, streaming SSE"
git push -u origin week4/your-name-strands-agent
```

Then open a Pull Request on GitHub, describe what was built and how to test it, and tag your week owner as reviewer.

---

## Week 4 Deliverables Checklist

- [ ] `POST /api/v1/agent` returns HTTP 200 with tool trace for "Turn off the Dishwasher"
- [ ] `tools_called` includes `toggle_device` in the response
- [ ] Smart Control page reflects agent device changes within 3 seconds
- [ ] `POST /api/v1/agent/stream` streams tool_call and token events
- [ ] `GET /api/v1/agent/tools` returns all 5 tool schemas
- [ ] Critical device guard: turning off Refrigerator returns error
- [ ] Feature branch pushed to GitHub
- [ ] Pull request created with reviewer tagged
- [ ] Verbal prep: function call vs tool call explanation ready

---

*VoltStream Internship Program · Week 4 · Agentic AI · For Internal Use Only*
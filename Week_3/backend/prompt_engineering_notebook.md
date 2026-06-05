# Week 3 — Prompt Engineering Notebook
# VoltStream AI Track · OpenAI Edition

This notebook documents all **four required prompt patterns** using the OpenAI API.
Each section shows the exact prompt, the model's response, and a one-sentence analysis.

Run this notebook after setting `OPENAI_API_KEY` in your `.env`.

---

## Setup

```python
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # loads .env from project root or backend/

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chat(system: str, user: str, temperature: float = 0.3, max_tokens: int = 400) -> str:
    """Thin wrapper around the Chat Completions API."""
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    )
    return resp.choices[0].message.content.strip()
```

---

## Pattern 1 — Zero-Shot

No examples are given. The model relies solely on pre-trained knowledge.

**When to use:** General factual questions where the model has strong domain coverage.

```python
system_prompt = "You are a concise energy-systems expert."

user_prompt = """
What is net metering, and how does it benefit a prosumer who installs rooftop solar panels?
"""

response = chat(system_prompt, user_prompt)
print(response)
```

**Expected output (your run will vary slightly):**
```
Net metering is a billing arrangement that allows prosumers—households that both
produce and consume electricity—to export surplus solar energy to the grid and
receive a credit on their electricity bill.

Benefits for a solar prosumer:
1. Lower bills – credits offset energy drawn from the grid at night or on cloudy days.
2. Faster payback – the effective cost of solar generation falls, reducing the system's
   payback period from ~8 years to ~5-6 years in many markets.
3. Grid stability incentive – utilities get distributed generation during peak demand hours.

The credit rate varies by jurisdiction; some markets offer 1:1 (retail) credits, others
offer a lower wholesale "feed-in tariff".
```

**Analysis:** Zero-shot succeeded because net metering is well-covered in the model's
training data; for niche regulatory questions (e.g., specific state tariff schedules) it
would likely hallucinate—use RAG instead.

---

## Pattern 2 — Few-Shot

Two to five input–output examples precede the actual question.
The model infers the pattern and replicates it for a new input.

**When to use:** Consistent formatting or domain-specific response style
(e.g., always return a structured JSON, always classify into fixed categories).

```python
system_prompt = "You are a smart-home energy classifier."

user_prompt = """
Classify each appliance into: HIGH_LOAD (>1 kW), MEDIUM_LOAD (200 W – 1 kW), or LOW_LOAD (<200 W).
Reply with ONLY: <appliance>: <category>

Examples:
Electric oven (2 200 W): HIGH_LOAD
LED desk lamp (12 W): LOW_LOAD
Laptop charger (65 W): LOW_LOAD
Dishwasher (1 800 W): HIGH_LOAD
Smart speaker (5 W): LOW_LOAD

Now classify:
Microwave (900 W):
Pool pump (750 W):
Ceiling fan (55 W):
EV charger (7 200 W):
"""

response = chat(system_prompt, user_prompt, temperature=0.0)
print(response)
```

**Expected output:**
```
Microwave (900 W): MEDIUM_LOAD
Pool pump (750 W): MEDIUM_LOAD
Ceiling fan (55 W): LOW_LOAD
EV charger (7 200 W): HIGH_LOAD
```

**Analysis:** Few-shot examples locked in both the format (`<name>: <CATEGORY>`) and
the boundary logic (900 W correctly landing in MEDIUM not HIGH), eliminating the need
for any output parsing code.

---

## Pattern 3 — Chain-of-Thought (CoT)

The model is instructed to reason step-by-step before giving a final answer.
This dramatically improves accuracy on multi-step calculations.

**When to use:** Any question requiring arithmetic, comparisons, or sequential logic.

```python
system_prompt = (
    "You are a home-energy financial advisor. "
    "Think step by step before giving your final answer."
)

user_prompt = """
A household in Hyderabad uses 28 kWh per day.
They install a 5 kW rooftop solar system that generates an average of 18 kWh/day.
The grid electricity tariff is ₹6.50/kWh.
Net metering credits surplus at ₹3.80/kWh.
On a typical day they run their AC (1.5 kW) for 8 hours, which is NOT solar-powered.

Question: What is the net daily electricity cost after solar?

Think step by step.
"""

response = chat(system_prompt, user_prompt, temperature=0.0, max_tokens=600)
print(response)
```

**Expected output (chain-of-thought visible):**
```
Step 1 — Total daily consumption
  Total usage = 28 kWh

Step 2 — Solar generation vs. AC load
  Solar generates 18 kWh/day.
  AC consumes 1.5 kW × 8 h = 12 kWh/day (grid-powered, not solar).
  Remaining solar for other loads = 18 kWh.

Step 3 — Solar self-consumption
  Non-AC load = 28 − 12 = 16 kWh/day.
  Solar covers 16 kWh of non-AC load (solar ≥ 16 kWh → full offset).
  Surplus solar exported = 18 − 16 = 2 kWh.

Step 4 — Grid draw
  Grid supplies: AC (12 kWh) + any shortfall (0 kWh) = 12 kWh.

Step 5 — Costs and credits
  Grid cost  = 12 kWh × ₹6.50 = ₹78.00
  Net-meter credit = 2 kWh × ₹3.80 = ₹7.60

Step 6 — Net cost
  Net daily cost = ₹78.00 − ₹7.60 = ₹70.40

Final answer: The net daily electricity cost is ₹70.40.
```

**Analysis:** Without the "think step by step" instruction the model often conflates
solar surplus with total consumption and produces a wrong figure; CoT makes each
intermediate value explicit and auditable.

---

## Pattern 4 — System Prompt (Persona + Guardrails)

A privileged instruction block sets the model's role, constraints, and fallback behaviour
before any user message. In the OpenAI SDK this is the `system` role message.

**When to use:** Role assignment, topic guardrails, response-format enforcement,
and safety constraints—exactly what the `/qa` endpoint uses in production.

```python
# This is the EXACT system prompt used in backend/routes/qa.py
system_prompt = """You are VoltStream QA — a precise energy-domain Q&A assistant.

STRICT RULES:
1. Answer ONLY using information found in the CONTEXT CHUNKS below.
2. Do NOT use any knowledge outside the provided context.
3. If the context does not contain sufficient information to answer the question, respond with exactly:
   I don't have that information
4. Do not add any extra commentary when using the fallback phrase — reply with only that exact phrase.
5. Keep answers factual, specific, and concise. Cite relevant figures or thresholds when present.

You are an expert in energy systems, solar generation, grid regulations, and inverter specifications."""

# ── In-scope test ────────────────────────────────────────────────────────────
context = """[Chunk 1]
Grid-connected inverters must achieve a minimum efficiency of 93% at 20% rated load
and 97% at full rated load as per IS 16221 Part 1. Anti-islanding protection must
disconnect within 2 seconds of grid failure detection.

[Chunk 2]
The maximum permissible Total Harmonic Distortion (THD) for current injected into
the grid is 5% at rated output. Inverters above 10 kW capacity require type-testing
approval from a NABL-accredited laboratory before grid connection is permitted.
"""

user_prompt_in_scope = f"""CONTEXT CHUNKS:

{context}

---

QUESTION: What is the minimum efficiency rating required for grid-connected inverters?

ANSWER:"""

response_in = chat(system_prompt, user_prompt_in_scope, temperature=0.0)
print("IN-SCOPE:", response_in)

# ── Out-of-scope test ─────────────────────────────────────────────────────────
user_prompt_out_of_scope = f"""CONTEXT CHUNKS:

{context}

---

QUESTION: What is the capital of France?

ANSWER:"""

response_out = chat(system_prompt, user_prompt_out_of_scope, temperature=0.0)
print("OUT-OF-SCOPE:", response_out)
```

**Expected outputs:**
```
IN-SCOPE:
Grid-connected inverters must achieve a minimum efficiency of 93% at 20% rated load
and 97% at full rated load, as specified by IS 16221 Part 1.

OUT-OF-SCOPE:
I don't have that information
```

**Analysis:** The system prompt successfully enforces two critical behaviours:
(1) grounding answers in retrieved context only, eliminating hallucination, and
(2) producing the *exact* fallback string required for the demo checkpoint, making
output normalisation in application code unnecessary.

---

## Summary Table

| Pattern | Key Mechanism | Best For |
|---|---|---|
| Zero-shot | No examples; model uses pre-trained knowledge | Broad factual Q&A |
| Few-shot | 2–5 examples show desired format | Consistent output structure |
| Chain-of-thought | "Think step by step" triggers explicit reasoning | Multi-step arithmetic / logic |
| System prompt | Privileged instruction block sets persona + guardrails | RAG constraints, fallback enforcement |

---

## Running This Notebook

```bash
# From the backend/ directory
pip install jupyter openai python-dotenv
cp .env.example .env          # fill in OPENAI_API_KEY
jupyter notebook prompt_engineering_notebook.md   # or convert to .ipynb first
```

Or convert to Jupyter notebook:
```bash
pip install jupytext
jupytext --to notebook prompt_engineering_notebook.md
jupyter notebook prompt_engineering_notebook.ipynb
```

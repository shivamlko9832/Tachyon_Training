# TACHYON

## AIML Intern Pre-Boarding Plan

**Pre-Boarding Foundations + AI Concepts Brush-Up**  
**Version:** v1.0  
**Year:** 2026

---

## Quick Info

| Audience | Total Est. Time | Goal |
|---|---:|---|
| Newly Hired AIML Interns | ~60–80 hours total | Understand AI and build first RAG agent on cloud |

This plan is shared with all AIML interns right after offer acceptance. It has two parts:

1. **Part 1: Pre-Boarding Foundations** — technical baseline required before Day 1  
2. **Part 2: AI Concepts Brush-Up** — 8 AI topics to revise before training begins

---

## How to Use This Plan

### Step 1
Complete **Part 1 (Pre-Boarding Foundations)** before your first day.  
Estimated time: **20–30 hours over 2 weeks**.  
You should be able to show and push your work to GitHub.

### Step 2
On Day 1, explain in one sentence each:
- CORS
- Pydantic
- React Router

### Step 3
Read **Part 2 (AI Concepts Brush-Up — 8 topics)** before joining.  
This part is concept-focused (no mandatory builds). Ensure each **Done When** checkpoint is clear to you.

### Step 4
Use the progress trackers at the end of each part and bring them for mentor check-in on Day 1.

---

## Resource Labels

- **[★ Primary]** = required, start here  
- **[☆ Supplementary]** = optional deep dive

All links should be free or have a free tier. If any link is unavailable, use a similar resource from the internet.

---

## Rule for Completion

Only mark a task complete when you satisfy the **Done When** checkpoint.  
Watching videos alone does not count as completion.

---

# PART 1 — PRE-BOARDING FOUNDATIONS

**Complete before Day 1**  
**Estimated time:** 20–30 hours  
**Sent at offer acceptance**

These are the technical basics every intern should have before AI training starts.  
If you already know a topic well, skim and move ahead.

---

## 1) Python Fundamentals *(optional for experienced devs)* — Est. 2–3h

Topics:
- Variables, lists, dicts
- Loops, functions
- OOP basics
- Virtual environments (`venv`)
- `pip`

**[★ Primary Resources]**
- Programming with Mosh — Python for Beginners (6h)
- freeCodeCamp — Python Crash Course (4h)
- Google Crash Course on Python — Coursera (audit free)

**[☆ Supplementary Resources]**
- Official Python Tutorial — docs.python.org
- Corey Schafer — Python OOP Tutorials (Playlist)

**Done When:**  
You can write a Python script that reads a JSON file, filters a list of dictionaries by condition, and prints the result. You can also create and activate a virtual environment.

---

## 2) Git & GitHub Basics — Est. 2h

Topics:
- `git init`, `clone`, `add`, `commit`, `push`, `pull`
- Branching, merging, pull requests

**[★ Primary Resources]**
- freeCodeCamp — Git and GitHub Crash Course (1h)
- Traversy Media — Git & GitHub Crash Course for Beginners

**[☆ Supplementary Resources]**
- GitHub Docs — Getting Started
- Interactive Git Tutorial — learngitbranching.js.org

**Done When:**  
Create a GitHub repo, clone it, create a branch, add a Python file, commit with a message, push to the branch, and open a pull request.

---

## 3) HTML + CSS + JavaScript Basics — Est. 3h

Topics:
- DOM manipulation
- Event listeners
- `fetch` API
- ES6 arrow functions
- Promises and `async/await`

**[★ Primary Resources]**
- freeCodeCamp — HTML & CSS Full Course (4h)
- Traversy Media — JavaScript Crash Course for Beginners (1.5h)
- freeCodeCamp — JavaScript Algorithms and Data Structures

**[☆ Supplementary Resources]**
- MDN Web Docs — Learn Web Development
- JavaScript.info — Modern JavaScript Tutorial

**Done When:**  
Write a plain HTML page with a button that calls `fetch()` to a public API (for example JSONPlaceholder) and renders output in a `div` through DOM manipulation.

---

## 4) Docker Fundamentals — Est. 2h

Topics:
- Container vs VM
- Writing a Dockerfile
- `docker build`, `docker run`, `docker push`

**[★ Primary Resources]**
- TechWorld with Nana — Docker Crash Course for Absolute Beginners (1h)
- Docker Official — Get Started Tutorial

**[☆ Supplementary Resources]**
- TechWorld with Nana — Docker Tutorial Full Course (3h)
- Play with Docker — Free Browser-based Lab

**Done When:**  
Write a Dockerfile for a simple Python script, build an image, run the container, verify output, and push image to Docker Hub.

---

## 5) FastAPI Introduction — Est. 2h

Topics:
- Install FastAPI + Uvicorn
- GET/POST/PATCH routes
- Pydantic request/response models
- `CORSMiddleware`
- Local run and `/docs`

**[★ Primary Resources]**
- freeCodeCamp — FastAPI Course for Beginners (1h)
- Amigoscode — FastAPI Tutorial: Building RESTful APIs (1h)
- FastAPI Official Tutorial — First Steps

**[☆ Supplementary Resources]**
- FastAPI Official Docs — Full Tutorial
- Pydantic v2 Docs

**Done When:**  
Build a FastAPI app with at least one GET and one POST route using Pydantic models, add CORS allowing all origins, and test routes from `/docs`.

---

## 6) ReactJS Basics — Est. 3–4h

Topics:
- Components, JSX
- `useState`, `useEffect`
- Props
- Event handling (`onClick`, `onChange`)
- Fetch API data and render

**[★ Primary Resources]**
- freeCodeCamp — React Course for Beginners (watch first 3h)
- Traversy Media — React Crash Course (2h)
- React Official Docs — Learn React

**[☆ Supplementary Resources]**
- Codevolution — React Tutorial for Beginners (Playlist)
- Scrimba — Learn React for Free

**Done When:**  
Build a React component that calls a local FastAPI endpoint on page load, stores data in `useState`, and renders it in a list.

---

## 7) React Router v7 — Est. 1–2h

Topics:
- `BrowserRouter`, `Route`, `NavLink`, `Outlet`
- Nested routes

**[★ Primary Resources]**
- React Router v7 — Official Getting Started
- Traversy Media — React Router v6/v7 Crash Course

**[☆ Supplementary Resources]**
- React Router Docs — Main Concepts

**Done When:**  
Build a 3-page React app (Home, About, Contact) with sidebar navigation via `NavLink`. URL should change without full page reload.

---

## 8) Tailwind CSS — Est. 1h

Topics:
- Utility-first styling
- Spacing, flexbox, colors, responsive breakpoints

**[★ Primary Resources]**
- Traversy Media — Tailwind CSS Crash Course (2h)
- Tailwind CSS Official Docs

**[☆ Supplementary Resources]**
- Tailwind CSS Playground

**Done When:**  
Build something using all above concepts, bring it on Day 1, and push it to GitHub.

---

## Part 1 — Pre-Boarding Progress Tracker

**Intern Name:** ___________________________  
**Start Date:** _______________  
**Day 1 Target:** _______________

| # | Topic | Done When | Est. | Status | Date | Notes |
|---:|---|---|---:|---|---|---|
| 1 | Python Fundamentals (optional for experienced) | Script reads JSON and filters list of dicts | 2–3h |  |  |  |
| 2 | Git & GitHub | Push a branch and open a pull request on GitHub | 2h |  |  |  |
| 3 | HTML + CSS + JS Basics | Fetch API call in plain HTML, render in DOM | 3h |  |  |  |
| 4 | Docker Fundamentals | Build + run + push container to Docker Hub | 2h |  |  |  |
| 5 | FastAPI Introduction | GET + POST with Pydantic, CORS, working `/docs` | 2h |  |  |  |
| 6 | ReactJS Basics | React component fetches FastAPI data into `useState` | 3–4h |  |  |  |
| 7 | React Router v7 | 3-page SPA with `NavLink` and clean URL routing | 1–2h |  |  |  |
| 8 | Tailwind CSS | Responsive utility-class based app | 1h |  |  |  |

**Status options:** Not Started | In Progress | Completed | Needs Help

---

# PART 2 — AI CONCEPTS BRUSH-UP

**Read before joining**  
**No mandatory builds**  
**Concept-focused preparation**

You are expected to understand these topics before training starts.  
Hands-on implementations happen during the 6-week program after joining.

---

## 1) AI Landscape

Key concepts:
- Basic AI/ML: pattern learning for prediction/classification
- Generative AI: creates new content (text/images/code)
- Agentic AI: GenAI + tools + goals + memory
- Transformers: attention-based architecture
- Tokens, embeddings, context window

Resources:
- Andrej Karpathy — Intro to Large Language Models (1h)
- 3Blue1Brown — Visual intro to Transformers (27 min)

**Done When:**  
Explain GenAI vs Agentic AI in 30 seconds without notes.

---

## 2) Daily AI Tools

Key concepts:
- Chat tools: Claude, ChatGPT, Gemini
- Coding assistants: GitHub Copilot, Cursor, Claude Code
- Frameworks/builders: LangChain, Vertex AI Agent Builder, AWS Bedrock Agents, MCP

Resources:
- Claude — Try it free
- GitHub Copilot — Free tier for individuals

**Done When:**  
Try at least one tool from each category and explain when to use Claude vs GitHub Copilot.

---

## 3) LLM API Basics

Key concepts:
- API key safety (never commit keys)
- HTTP header + JSON prompt body basics
- Token-based pricing awareness

Resources:
- Anthropic API Quickstart (official docs)
- Anthropic Cookbook (Python examples)

**Done When:**  
Call Anthropic API from Python and print model response in terminal.

---

## 4) Databases for AI

Key concepts:
- Postgres + `pgvector`: SQL + vectors
- MongoDB: document and session data
- ChromaDB: local semantic search vectors

Resources:
- ChromaDB Getting Started
- What is a Vector Database? — Pinecone

**Done When:**  
Answer where to store user profiles vs chat embeddings vs search vectors.

---

## 5) RAG Pipeline

Key concepts:
- RAG = Retrieval-Augmented Generation
- Ingest: chunk → embed → store
- Retrieve: query embed → similarity search → top-k chunks
- Generate: context + query → grounded answer

Resources:
- DeepLearning.AI — Vector Databases & Embeddings (1.5h)
- LangChain RAG Tutorial

**Done When:**  
Explain the 3-step flow: Ingest → Retrieve → Generate without notes.

---

## 6) Cloud Basics for AI

Key concepts:
- Serverless: Lambda / Cloud Functions
- Object storage: S3 / GCS
- Deploy FastAPI via Docker on Cloud Run or Lambda + Mangum
- Secrets management for API keys

Resources:
- GCP Free Tier ($300 credits)
- AWS Free Tier

**Done When:**  
Know what Cloud Run and Lambda do, and name FastAPI deployment steps.

---

## 7) Agentic Frameworks + MCP

Key concepts:
- Agent = LLM + tools + planner + memory
- Tool calling behavior for multi-step tasks
- GCP track: Google ADK
- AWS track: Strands Agents
- MCP: standard for safe tool integrations
- Webhooks: event-driven HTTP callbacks

Resources:
- Google ADK Docs
- Strands Agents Quickstart
- MCP Official Quickstart

**Done When:**  
Explain in plain English: agent, tool call, and why MCP exists.

---

## 8) Production Readiness

Key concepts:
- Evals for quality checks
- Observability: cost, latency, error tracking
- RAG enhancements: reranking, query rewrite, citations
- Safety: injection defense, PII redaction, scoped tool permissions

Resources:
- DeepLearning.AI — Evaluating AI Agents (2h)
- Langfuse — Open-source LLM observability

**Done When:**  
Understand what evals are and why observability is essential before shipping.

---

## Part 2 — AI Concepts Brush-Up Tracker

| # | Topic | Done When | Resource | Status |
|---:|---|---|---|---|
| 1 | AI Landscape | Explain GenAI vs Agentic AI in 30 seconds without notes | Andrej Karpathy |  |
| 2 | Daily AI Tools | Try one tool from each category; explain Claude vs Copilot use-case | Claude |  |
| 3 | LLM API Basics | Call Anthropic API from Python and print response | Anthropic API Quickstart |  |
| 4 | Databases for AI | Explain storage choice for profiles, embeddings, and search vectors | ChromaDB Getting Started |  |
| 5 | RAG Pipeline | Explain Ingest → Retrieve → Generate without notes | DeepLearning.AI |  |
| 6 | Cloud Basics for AI | Explain Cloud Run/Lambda and FastAPI deploy steps | GCP Free Tier |  |
| 7 | Agentic Frameworks + MCP | Explain agent, tool call, MCP in plain English | Google ADK Docs |  |
| 8 | Production Readiness | Explain evals and observability importance | DeepLearning.AI |  |

---

## Run Instructions

Use these commands from the project root (`Tachyon_Preboarding`).

### 1) Activate Virtual Environment

```powershell
.\venv\Scripts\Activate.ps1
```

### 2) Install FastAPI Dependencies

```powershell
.\venv\Scripts\python.exe -m pip install -r .\FastAPI_Introduction\requirements.txt
```

### 3) Run All Verified Checks (Recommended)

```powershell
powershell -ExecutionPolicy Bypass -File .\execute_all_projects.ps1
```

### 4) Run Individual Projects

```powershell
# Python Basics
.\venv\Scripts\python.exe .\Python_Basics\main.py

# Docker Fundamentals (local script)
.\venv\Scripts\python.exe .\Docker_Fundamentals\app.py

# Docker Fundamentals (container build + run)
docker build -t tachyon-docker-demo .\Docker_Fundamentals
docker run --rm tachyon-docker-demo
```

### 5) Run FastAPI Server

```powershell
.\venv\Scripts\python.exe -m uvicorn FastAPI_Introduction.main:app --reload
```

Then open:
- `http://127.0.0.1:8000/docs` (interactive Swagger docs)
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/students`

### 6) Open Frontend Demos in Browser

- `HTML_CSS_JS_Basics/index.html`
- `ReactJS_Basics/index.html` (expects FastAPI server running on `127.0.0.1:8000`)
- `React_Router_v7/index.html`
- `Tailwind_CSS/index.html`
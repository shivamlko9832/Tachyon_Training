# ⚡ VoltStream — Energy Intelligence Platform

> A production-grade React + FastAPI energy monitoring SPA for prosumers (consumers who also generate solar energy).
> Built as the reference application for the Tachyon AIML Internship Training Program — Week 1 Cloud Track.

---

## 🗂 Project Structure

```
voltstream/
├── backend/                # FastAPI Python backend
│   ├── main.py             # All API routes, Pydantic models, mock data
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React 18 + Vite frontend
│   ├── src/
│   │   ├── pages/          # LiveDashboard, UsageHistory, SmartControl, Invoices, NotFound
│   │   ├── components/     # Sidebar, StatCard, GaugeRing, LoadingSpinner
│   │   ├── hooks/          # useFetch, usePoll
│   │   ├── data/           # api.js — fetch service layer
│   │   ├── App.jsx         # Router + Layout
│   │   └── index.css       # Tailwind + custom CSS variables/animations
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
└── docker-compose.yml      # Full-stack local compose
```

---

## 🚀 Running Locally (Without Docker)

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:5173

> The Vite dev server proxies `/api` requests to `http://localhost:8000` automatically.

---

## 🐳 Running with Docker Compose

```bash
# From the voltstream/ root directory
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## ☁ GCP Cloud Run Deployment (Week 1 Checkpoint)

### Step 1 — Build & Push Backend to Artifact Registry

```bash
# Set your project variables
PROJECT_ID=your-gcp-project-id
REGION=us-central1
REPO=voltstream-repo

# Create Artifact Registry repository
gcloud artifacts repositories create $REPO \
  --repository-format=docker \
  --location=$REGION

# Configure Docker auth
gcloud auth configure-docker $REGION-docker.pkg.dev

# Build and push
cd backend
docker build -t $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/voltstream-api:v1 .
docker push $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/voltstream-api:v1
```

### Step 2 — Deploy to Cloud Run

```bash
gcloud run deploy voltstream-api \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO/voltstream-api:v1 \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8000
```

### Step 3 — Deploy Frontend to Firebase Hosting

```bash
cd frontend
# Set the Cloud Run API URL
echo "VITE_API_URL=https://voltstream-api-xxxx.run.app" > .env.production
npm run build

# Firebase setup (one-time)
npm install -g firebase-tools
firebase login
firebase init hosting   # select dist/ as public dir, configure as SPA
firebase deploy
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/live` | Real-time grid draw, solar generation, net usage, battery % |
| GET | `/api/v1/analytics/history?period=daily` | Energy history (daily/weekly/monthly) |
| GET | `/api/v1/devices` | All smart devices and their state |
| PATCH | `/api/v1/devices/{id}` | Toggle device ON/OFF. 404 if not found |
| GET | `/api/v1/billing/summary` | Current balance, projected bill, budget alert |

---

## 🖥 Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LiveDashboard | Real-time gauges: solar, grid, battery + live sparkline |
| `/analytics` | UsageHistory | Bar/line charts with daily/weekly/monthly filter |
| `/devices` | SmartControl | Device cards with ON/OFF toggle, category filter |
| `/billing` | Invoices | Budget tracking, projected bill, monthly invoice history |
| `*` | NotFound | 404 fallback |

---

## 🛠 Tech Stack

**Frontend**
- React 18 + React Router v7
- Vite 6 (build tool)
- Tailwind CSS v3
- Recharts (AreaChart, BarChart, LineChart)
- Lucide React (icons)

**Backend**
- FastAPI + Uvicorn
- Pydantic v2
- CORSMiddleware (open for dev)

**DevOps**
- Docker + Docker Compose
- Nginx (SPA serving in production)
- GCP Cloud Run + Artifact Registry (cloud deployment)
- Firebase Hosting (frontend CDN)

---

## 📋 Week 1 Checkpoint

✅ Deploy VoltStream FastAPI backend to Cloud Run  
✅ Open the live `/docs` URL and show all 5 endpoints working  
✅ Deploy React frontend to Firebase Hosting  
✅ Show full app running end-to-end in browser  

**Midweek Check-In:** Can you explain what a container image is?

---

## 🔮 Roadmap (Weeks 3–8)

- **Week 3:** Add `POST /api/v1/chat` (Gemini/Bedrock LLM) + `POST /api/v1/qa` (ChromaDB RAG bot)
- **Week 4:** Add `POST /api/v1/agent` (ADK / Strands agentic endpoint)
- **Weeks 7–8:** Full VoltStream AI Copilot capstone

---

*Tachyon AIML Internship Program v4.0 · 2026 · Confidential*

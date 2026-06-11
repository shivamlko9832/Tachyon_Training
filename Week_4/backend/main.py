from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import random
from datetime import datetime, timedelta
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)

from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title="VoltStream API",
    description="AI-powered energy monitoring platform — Week 4: Agentic AI",
    version="2.0.0",
    docs_url=None, redoc_url=None, openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def custom_openapi_schema():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title, version=app.version,
        description=app.description, routes=app.routes,
    )
    schema["servers"] = [{"url": "http://localhost:8080", "description": "Local Development"}]
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi_schema

@app.get("/openapi.json", include_in_schema=False)
def custom_openapi():
    return JSONResponse(app.openapi())

@app.get("/docs", include_in_schema=False)
def custom_docs():
    return get_swagger_ui_html(openapi_url="/openapi.json", title="VoltStream API Docs")

# ── Import shared device state FIRST ──────────────────────────────────────────
# Both main.py and tools/device_tools.py import DEVICES from shared_state.
# Python module caching guarantees they get the SAME dict object in memory.
# Agent tool mutations are immediately visible here.
from shared_state import DEVICES

# ── Week 3 routers ─────────────────────────────────────────────────────────────
from routes.chat import router as chat_router
from routes.qa   import router as qa_router

app.include_router(chat_router, prefix="/api/v1/chat", tags=["AI - Chat"])
app.include_router(qa_router,   prefix="/api/v1/qa",   tags=["AI - Q&A (RAG)"])

# ── Week 4: Agent router ───────────────────────────────────────────────────────
from routes.agent import router as agent_router
app.include_router(agent_router, prefix="/api/v1/agent", tags=["AI - Agent (Week 4)"])

# ── Models ─────────────────────────────────────────────────────────────────────
class LivePowerStatus(BaseModel):
    grid_draw_kw: float
    solar_generation_kw: float
    net_usage_kw: float
    battery_percent: float
    timestamp: str
    status: str

class EnergyDataPoint(BaseModel):
    label: str
    usage_kwh: float
    solar_kwh: float
    cost_usd: float
    savings_usd: float

class DeviceResponse(BaseModel):
    id: str
    name: str
    category: str
    power_w: int
    is_on: bool
    room: str
    consumption_today_kwh: float

class DeviceToggleRequest(BaseModel):
    is_on: bool

class BillingSummary(BaseModel):
    current_balance: float
    projected_bill: float
    budget_limit: float
    last_month_bill: float
    savings_this_month: float
    solar_credits: float
    days_remaining: int
    alert: bool

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "VoltStream API v2.0 — Week 4 Agentic AI", "docs": "/docs"}

@app.get("/api/v1/dashboard/live", response_model=LivePowerStatus)
def get_live_dashboard():
    solar = round(random.uniform(2.8, 6.4), 2)
    grid  = round(random.uniform(0.5, 3.2), 2)
    net   = round(grid - solar, 2)
    status = "exporting" if net < 0 else ("importing" if net > 0.1 else "balanced")
    return LivePowerStatus(
        grid_draw_kw=grid, solar_generation_kw=solar, net_usage_kw=net,
        battery_percent=round(random.uniform(45, 92), 1),
        timestamp=datetime.utcnow().isoformat() + "Z", status=status,
    )

@app.get("/api/v1/analytics/history", response_model=List[EnergyDataPoint])
def get_analytics_history(period: str = "daily"):
    data = []
    if period == "daily":
        labels = [(datetime.now() - timedelta(days=i)).strftime("%a %d") for i in range(13, -1, -1)]
    elif period == "weekly":
        labels = [f"Week {i}" for i in range(1, 9)]
    else:
        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        labels = months[:datetime.now().month]
    for label in labels:
        usage = round(random.uniform(18, 42), 1)
        solar = round(random.uniform(10, 28), 1)
        data.append(EnergyDataPoint(
            label=label, usage_kwh=usage, solar_kwh=solar,
            cost_usd=round(usage * 0.14, 2),
            savings_usd=round(solar * 0.14 * 0.85, 2),
        ))
    return data

@app.get("/api/v1/devices", response_model=List[DeviceResponse])
def get_devices():
    # Reads directly from shared DEVICES dict — reflects all agent changes
    return [
        DeviceResponse(
            id=d["id"], name=d["name"], category=d["category"],
            power_w=d["power_w"], is_on=d["is_on"], room=d["room"],
            consumption_today_kwh=d["consumption_today_kwh"],
        )
        for d in DEVICES.values()
    ]

@app.patch("/api/v1/devices/{device_id}", response_model=DeviceResponse)
def toggle_device_rest(device_id: str, body: DeviceToggleRequest):
    # Manual toggle via REST — also mutates shared DEVICES dict
    device = DEVICES.get(device_id)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")
    device["is_on"] = body.is_on
    if body.is_on:
        device["consumption_today_kwh"] = round(
            device["consumption_today_kwh"] + device["power_w"] / 1000 * 0.5, 2
        )
    return DeviceResponse(
        id=device["id"], name=device["name"], category=device["category"],
        power_w=device["power_w"], is_on=device["is_on"], room=device["room"],
        consumption_today_kwh=device["consumption_today_kwh"],
    )

@app.get("/api/v1/billing/summary", response_model=BillingSummary)
def get_billing_summary():
    now = datetime.now()
    days_elapsed   = now.day
    days_remaining = 30 - days_elapsed
    current   = round(days_elapsed * 2.18, 2)
    projected = round(30 * 2.18, 2)
    budget    = 80.0
    return BillingSummary(
        current_balance=current, projected_bill=projected, budget_limit=budget,
        last_month_bill=74.32, savings_this_month=round(days_elapsed * 1.42, 2),
        solar_credits=round(days_elapsed * 0.89, 2),
        days_remaining=days_remaining, alert=projected > budget,
    )

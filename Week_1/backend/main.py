from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import random
from datetime import datetime, timedelta

app = FastAPI(
    title="VoltStream API",
    description="AI-powered energy monitoring platform for prosumers",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Custom OpenAPI schema with /prod server URL ───────────────────────────────
def custom_openapi_schema():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Tell Swagger UI to use the full /prod base URL for all requests
    schema["servers"] = [
        {"url": "https://p0zatmquc0.execute-api.us-east-1.amazonaws.com/prod",
         "description": "AWS Production"}
    ]
    app.openapi_schema = schema
    return app.openapi_schema

app.openapi = custom_openapi_schema

@app.get("/openapi.json", include_in_schema=False)
def custom_openapi():
    return JSONResponse(app.openapi())

@app.get("/docs", include_in_schema=False)
def custom_docs():
    return get_swagger_ui_html(
        openapi_url="/prod/openapi.json",
        title="VoltStream API Docs",
    )

# ─── Models ───────────────────────────────────────────────────────────────────

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

# ─── Mock Data ─────────────────────────────────────────────────────────────────

devices_db = [
    {"id": "d001", "name": "EV Charger", "category": "transport", "power_w": 7200, "is_on": True, "room": "Garage", "consumption_today_kwh": 14.4},
    {"id": "d002", "name": "AC Unit - Living", "category": "climate", "power_w": 1800, "is_on": True, "room": "Living Room", "consumption_today_kwh": 9.2},
    {"id": "d003", "name": "Water Heater", "category": "appliance", "power_w": 2000, "is_on": False, "room": "Bathroom", "consumption_today_kwh": 3.1},
    {"id": "d004", "name": "Refrigerator", "category": "appliance", "power_w": 150, "is_on": True, "room": "Kitchen", "consumption_today_kwh": 1.8},
    {"id": "d005", "name": "Washing Machine", "category": "appliance", "power_w": 1200, "is_on": False, "room": "Utility", "consumption_today_kwh": 0.0},
    {"id": "d006", "name": "Smart TV", "category": "entertainment", "power_w": 120, "is_on": True, "room": "Living Room", "consumption_today_kwh": 0.6},
    {"id": "d007", "name": "AC Unit - Bedroom", "category": "climate", "power_w": 1500, "is_on": False, "room": "Bedroom", "consumption_today_kwh": 0.0},
    {"id": "d008", "name": "Pool Pump", "category": "outdoor", "power_w": 900, "is_on": True, "room": "Backyard", "consumption_today_kwh": 5.4},
]

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "VoltStream API is live", "docs": "/prod/docs"}

@app.get("/api/v1/dashboard/live", response_model=LivePowerStatus)
def get_live_dashboard():
    solar = round(random.uniform(2.8, 6.4), 2) 
    grid = round(random.uniform(0.5, 3.2), 2)
    net = round(grid - solar, 2) # net usage is positive when importing from grid, negative when exporting to grid
    status = "exporting" if net < 0 else ("importing" if net > 0.1 else "balanced")
    return LivePowerStatus(
        grid_draw_kw=grid,
        solar_generation_kw=solar,
        net_usage_kw=net,
        battery_percent=round(random.uniform(45, 92), 1), # simulates a battery charge level between 45% and 92%
        timestamp=datetime.utcnow().isoformat() + "Z", 
        status=status,
    )

@app.get("/api/v1/analytics/history", response_model=List[EnergyDataPoint]) #
def get_analytics_history(period: str = "daily"):
    data = []
    if period == "daily":
        labels = [(datetime.now() - timedelta(days=i)).strftime("%a %d") for i in range(13, -1, -1)] # generates labels for the past 14 days in "Day Date" format (e.g., "Mon 01", "Tue 02", etc.)
    elif period == "weekly":
        labels = [f"Week {i}" for i in range(1, 9)] # generates labels for the past 8 weeks in "Week N" format (e.g., "Week 1", "Week 2", etc.)
    else:
        months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
        labels = months[:datetime.now().month] # generates labels for the months of the current year up to the current month (e.g., "Jan", "Feb", etc.)
    for label in labels:
        usage = round(random.uniform(18, 42), 1) # simulates daily energy usage between 18 and 42 kWh
        solar = round(random.uniform(10, 28), 1) # simulates daily solar generation between 10 and 28 kWh, which contributes to cost savings and solar credits
        data.append(EnergyDataPoint(   
            label=label, usage_kwh=usage, solar_kwh=solar,
            cost_usd=round(usage * 0.14, 2), # assumes a flat rate of $0.14 per kWh for cost calculation
            savings_usd=round(solar * 0.14 * 0.85, 2) # assumes a solar credit rate of 85% of the cost savings
        ))
    return data

@app.get("/api/v1/devices", response_model=List[DeviceResponse])
def get_devices():
    return [DeviceResponse(**d) for d in devices_db]

@app.patch("/api/v1/devices/{device_id}", response_model=DeviceResponse)
def toggle_device(device_id: str, body: DeviceToggleRequest):
    for d in devices_db:
        if d["id"] == device_id:
            d["is_on"] = body.is_on
            if body.is_on:
                d["consumption_today_kwh"] = round(d["consumption_today_kwh"] + d["power_w"] / 1000 * 0.5, 2) # simulates an increase in consumption when the device is turned on, by adding half an hour's worth of energy usage based on the device's power rating
            return DeviceResponse(**d)
    raise HTTPException(status_code=404, detail=f"Device '{device_id}' not found")

@app.get("/api/v1/billing/summary", response_model=BillingSummary)
def get_billing_summary():
    now = datetime.now() # gets the current system date and time
    days_elapsed = now.day  #gets today's date number (1-30)
    days_remaining = 30 - days_elapsed
    current = round(days_elapsed * 2.18, 2) # assumes a daily cost of $2.18 based on current usage patterns
    projected = round(30 * 2.18, 2)  # projects the total bill for the month if current usage continues, by multiplying the daily cost by 30 days
    budget = 80.0 # sets a budget limit of $80 for the month, which can be used to trigger alerts if the projected bill exceeds this amount
    return BillingSummary(
        current_balance=current,
        projected_bill=projected,
        budget_limit=budget,
        last_month_bill=74.32,
        savings_this_month=round(days_elapsed * 1.42, 2),   # assumes daily savings of $1.42 based on solar generation and other factors
        solar_credits=round(days_elapsed * 0.89, 2),   # assumes daily solar credits of $0.89 based on current solar generation patterns
        days_remaining=days_remaining,
        alert=projected > budget,
    )
"""
shared_state.py — Single source of truth for device state.

Both main.py and tools/device_tools.py import _DEVICES from here.
Since Python caches module imports, both get the EXACT same dict object
in memory — mutations in the agent tools are immediately visible to the REST API.

Import pattern:
    from shared_state import DEVICES
"""

from typing import Dict, Any

# ── Master device registry ────────────────────────────────────────────────────
DEVICES: Dict[str, Dict[str, Any]] = {
    "d001": {"id":"d001","name":"EV Charger",       "category":"transport",    "power_w":7200, "is_on":True,  "room":"Garage",      "consumption_today_kwh":14.4,  "priority":"low"},
    "d002": {"id":"d002","name":"AC Unit - Living",  "category":"climate",      "power_w":1800, "is_on":True,  "room":"Living Room",  "consumption_today_kwh":9.2,   "priority":"high"},
    "d003": {"id":"d003","name":"Water Heater",      "category":"appliance",    "power_w":2000, "is_on":False, "room":"Bathroom",     "consumption_today_kwh":3.1,   "priority":"medium"},
    "d004": {"id":"d004","name":"Refrigerator",      "category":"appliance",    "power_w":150,  "is_on":True,  "room":"Kitchen",      "consumption_today_kwh":1.8,   "priority":"critical"},
    "d005": {"id":"d005","name":"Washing Machine",   "category":"appliance",    "power_w":1200, "is_on":False, "room":"Utility",      "consumption_today_kwh":0.0,   "priority":"low"},
    "d006": {"id":"d006","name":"Smart TV",          "category":"entertainment","power_w":120,  "is_on":True,  "room":"Living Room",  "consumption_today_kwh":0.6,   "priority":"low"},
    "d007": {"id":"d007","name":"AC Unit - Bedroom", "category":"climate",      "power_w":1500, "is_on":False, "room":"Bedroom",      "consumption_today_kwh":0.0,   "priority":"high"},
    "d008": {"id":"d008","name":"Pool Pump",         "category":"outdoor",      "power_w":900,  "is_on":True,  "room":"Backyard",     "consumption_today_kwh":5.4,   "priority":"low"},
    "d009": {"id":"d009","name":"Dishwasher",        "category":"appliance",    "power_w":1200, "is_on":True,  "room":"Kitchen",      "consumption_today_kwh":2.4,   "priority":"low"},
    "d010": {"id":"d010","name":"Solar Inverter",    "category":"generation",   "power_w":-5000,"is_on":True,  "room":"Rooftop",      "consumption_today_kwh":-21.1, "priority":"critical"},
}

# ── Event audit log ───────────────────────────────────────────────────────────
EVENT_LOG = []

def log_event(action: str, device_id: str, details: dict):
    from datetime import datetime
    EVENT_LOG.append({
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action": action,
        "device_id": device_id,
        "details": details,
    })
    if len(EVENT_LOG) > 100:
        EVENT_LOG.pop(0)

"""
VoltStream Device-Control Agent Tools — Week 4
Strands Agents @tool decorated functions.

ALL tools import DEVICES from shared_state.py — the single source of truth.
This guarantees that agent tool mutations are instantly visible to the REST API.
"""

import logging
from typing import Any, Dict, List, Optional

from strands import tool
from shared_state import DEVICES, log_event

logger = logging.getLogger(__name__)


def _find_device(query: str) -> Optional[Dict]:
    if query in DEVICES:
        return DEVICES[query]
    q = query.lower().strip()
    for d in DEVICES.values():
        if q in d["name"].lower():
            return d
    return None


@tool
def get_device_status(device_id: str) -> Dict[str, Any]:
    """
    Get the current status of a smart home device by its ID or name.
    Returns name, category, power_w, is_on state, room, consumption today,
    priority level, and estimated hourly cost in Rupees.

    Args:
        device_id: Device ID (e.g. 'd009') or name (e.g. 'Dishwasher')
    """
    device = _find_device(device_id)
    if not device:
        return {
            "error": f"Device '{device_id}' not found.",
            "available_devices": [f"{d['id']}={d['name']}" for d in DEVICES.values()],
        }
    return {
        "id": device["id"],
        "name": device["name"],
        "category": device["category"],
        "room": device["room"],
        "power_w": device["power_w"],
        "is_on": device["is_on"],
        "state": "ON" if device["is_on"] else "OFF",
        "consumption_today_kwh": device["consumption_today_kwh"],
        "priority": device["priority"],
        "estimated_hourly_cost_rs": round(abs(device["power_w"]) / 1000 * 6.5, 2),
    }


@tool
def toggle_device(device_id: str, turn_on: bool) -> Dict[str, Any]:
    """
    Turn a smart home device ON or OFF by its ID or name.
    Directly mutates the shared DEVICES dict — change is immediately
    visible to the REST API and Smart Control page.
    Refuses to turn OFF critical-priority devices (Refrigerator, Solar Inverter).

    Args:
        device_id: Device ID (e.g. 'd009') or name (e.g. 'Dishwasher')
        turn_on: True to turn ON, False to turn OFF
    """
    device = _find_device(device_id)
    if not device:
        return {
            "error": f"Device '{device_id}' not found.",
            "available_devices": [f"{d['id']}={d['name']}" for d in DEVICES.values()],
        }

    if device["priority"] == "critical" and not turn_on:
        return {
            "error": f"Cannot turn OFF {device['name']} — marked CRITICAL priority.",
            "reason": "Refrigerator and Solar Inverter are protected from agent shutoff.",
        }

    old_state = device["is_on"]
    if old_state == turn_on:
        return {
            "message": f"{device['name']} is already {'ON' if turn_on else 'OFF'}. No change.",
            "device_id": device["id"],
            "name": device["name"],
            "state": "ON" if turn_on else "OFF",
            "changed": False,
        }

    # ── Mutate shared state ────────────────────────────────────────────────────
    device["is_on"] = turn_on
    if turn_on:
        device["consumption_today_kwh"] = round(
            device["consumption_today_kwh"] + device["power_w"] / 1000 * 0.5, 2
        )

    action_str = "turned ON" if turn_on else "turned OFF"
    log_event("toggle", device["id"], {
        "from": old_state, "to": turn_on, "triggered_by": "strands-agent"
    })
    logger.info("strands-agent: %s -> %s (shared_state mutated)", device["name"], action_str)

    return {
        "success": True,
        "device_id": device["id"],
        "name": device["name"],
        "room": device["room"],
        "previous_state": "ON" if old_state else "OFF",
        "new_state": "ON" if turn_on else "OFF",
        "changed": True,
        "message": f"{device['name']} in {device['room']} has been {action_str}.",
    }


@tool
def list_all_devices() -> Dict[str, Any]:
    """
    List all smart home devices with current on/off status and power summary.
    Returns device inventory, total active load in kW, energy today, and cost.
    No arguments required.
    """
    devices_list = []
    total_active_w = 0
    total_kwh = 0.0
    on_count = 0

    for d in DEVICES.values():
        devices_list.append({
            "id": d["id"],
            "name": d["name"],
            "category": d["category"],
            "room": d["room"],
            "state": "ON" if d["is_on"] else "OFF",
            "power_w": d["power_w"],
            "consumption_today_kwh": d["consumption_today_kwh"],
        })
        if d["is_on"] and d["power_w"] > 0:
            total_active_w += d["power_w"]
            on_count += 1
        if d["consumption_today_kwh"] > 0:
            total_kwh += d["consumption_today_kwh"]

    return {
        "devices": devices_list,
        "total_devices": len(DEVICES),
        "devices_on": on_count,
        "devices_off": len(DEVICES) - on_count,
        "total_active_load_kw": round(total_active_w / 1000, 2),
        "total_energy_today_kwh": round(total_kwh, 2),
        "estimated_cost_today_rs": round(total_kwh * 6.5, 2),
    }


@tool
def get_energy_summary() -> Dict[str, Any]:
    """
    Get energy consumption analytics and cost breakdown for all devices today.
    Includes solar generation offset, net grid consumption, solar savings,
    and top 3 energy consumers. No arguments required.
    """
    from datetime import datetime
    breakdown = []
    solar_kwh = 0.0
    grid_kwh  = 0.0

    for d in DEVICES.values():
        kwh = d["consumption_today_kwh"]
        if d["category"] == "generation":
            solar_kwh += abs(kwh)
        else:
            grid_kwh += max(kwh, 0)
        breakdown.append({
            "id": d["id"], "name": d["name"],
            "kwh_today": kwh,
            "cost_rs": round(abs(kwh) * 6.5, 2) if kwh > 0 else 0,
        })

    breakdown.sort(key=lambda x: x["kwh_today"], reverse=True)
    net_grid_kwh = max(grid_kwh - solar_kwh, 0)

    return {
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "grid_consumption_kwh": round(grid_kwh, 2),
        "solar_generation_kwh": round(solar_kwh, 2),
        "net_grid_kwh": round(net_grid_kwh, 2),
        "gross_cost_rs": round(grid_kwh * 6.5, 2),
        "solar_savings_rs": round(solar_kwh * 6.5, 2),
        "net_cost_rs": round(net_grid_kwh * 6.5, 2),
        "top_consumers": breakdown[:3],
        "tip": "Shift EV charging to off-peak (22:00-06:00) to save ~20% on charging cost.",
    }


@tool
def bulk_device_action(category: str, turn_on: bool) -> Dict[str, Any]:
    """
    Turn ON or OFF all devices in a specific category simultaneously.
    Valid categories: transport, climate, appliance, entertainment, outdoor, generation.
    Critical-priority devices are automatically protected and skipped.

    Args:
        category: Device category (transport/climate/appliance/entertainment/outdoor/generation)
        turn_on: True = turn all ON, False = turn all OFF
    """
    valid = ["transport", "climate", "appliance", "entertainment", "outdoor", "generation"]
    if category.lower() not in valid:
        return {"error": f"Invalid category '{category}'.", "valid_categories": valid}

    affected = []
    skipped  = []

    for d in DEVICES.values():
        if d["category"] != category.lower():
            continue
        if d["priority"] == "critical" and not turn_on:
            skipped.append({"id": d["id"], "name": d["name"], "reason": "critical priority"})
            continue
        if d["is_on"] == turn_on:
            continue

        old = d["is_on"]
        d["is_on"] = turn_on
        if turn_on:
            d["consumption_today_kwh"] = round(
                d["consumption_today_kwh"] + d["power_w"] / 1000 * 0.5, 2
            )
        log_event("bulk_toggle", d["id"], {"category": category, "from": old, "to": turn_on})
        affected.append({"id": d["id"], "name": d["name"], "room": d["room"],
                         "new_state": "ON" if turn_on else "OFF"})

    action_str = "turned ON" if turn_on else "turned OFF"
    return {
        "success": True,
        "category": category,
        "action": action_str,
        "devices_affected": len(affected),
        "affected": affected,
        "skipped": skipped,
        "message": (f"{len(affected)} {category} device(s) {action_str}."
                    + (f" {len(skipped)} skipped (critical)." if skipped else "")),
    }


# ── Exports ───────────────────────────────────────────────────────────────────
STRANDS_TOOLS = [
    get_device_status,
    toggle_device,
    list_all_devices,
    get_energy_summary,
    bulk_device_action,
]


def get_event_log():
    from shared_state import EVENT_LOG
    return list(reversed(EVENT_LOG))

"""Anonymous SOS panic-button endpoints (no login required)."""

import time

from flask import Blueprint, request

from app.services.exceptions import ServiceError
from app.services.sos_service import SOSService
from app.utils.responses import error, success

sos_bp = Blueprint("sos", __name__)

# Simple per-IP cooldown so the open endpoint cannot be spammed.
# In-memory is fine for a single dev/demo server; use Redis in production.
SOS_COOLDOWN_SECONDS = 30
_sos_last_seen: dict[str, float] = {}


def _client_ip() -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "unknown"


@sos_bp.post("/sos")
def create_sos():
    payload = request.get_json(silent=True) or {}

    ip = _client_ip()
    now = time.monotonic()
    last = _sos_last_seen.get(ip)
    if last is not None and now - last < SOS_COOLDOWN_SECONDS:
        retry = int(SOS_COOLDOWN_SECONDS - (now - last)) + 1
        return error(
            f"SOS alert already sent. Please wait {retry}s before sending another.",
            status=429,
        )

    try:
        incident = SOSService.create_sos(
            category=payload.get("category"),
            description=payload.get("description"),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
            location_name=payload.get("location_name"),
        )
    except ServiceError as err:
        return error(err.message, status=err.status_code)

    _sos_last_seen[ip] = now
    return success(
        {"incident": incident.to_dict()},
        status=201,
        message="SOS alert sent. Emergency responders can see it now.",
    )


@sos_bp.get("/sos/numbers")
def emergency_numbers():
    return success({"numbers": SOSService.EMERGENCY_NUMBERS})

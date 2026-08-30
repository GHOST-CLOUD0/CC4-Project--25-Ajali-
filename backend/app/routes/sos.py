"""Anonymous SOS panic-button alerts.

These endpoints are intentionally public (no JWT): someone in an emergency
must be able to raise an alert and share their live location in seconds.
"""

import time

from flask import Blueprint, request

from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.utils.responses import error, success
from app.validation.validation import SOSSchema, validate_json

sos_bp = Blueprint("sos", __name__)

CATEGORY_LABELS = {
    "ambulance": "Ambulance / Medical",
    "accident": "Road Accident",
    "fire": "Fire",
    "crime": "Crime in Progress",
    "flood": "Flood",
    "other": "Other Emergency",
}

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
    """File an anonymous SOS alert; location coordinates are optional."""
    data = validate_json(SOSSchema)

    ip = _client_ip()
    now = time.monotonic()
    last = _sos_last_seen.get(ip)
    if last is not None and now - last < SOS_COOLDOWN_SECONDS:
        retry = int(SOS_COOLDOWN_SECONDS - (now - last)) + 1
        return error(
            f"SOS alert already sent. Please wait {retry}s before sending another.",
            status=429,
        )

    category = data["category"]
    label = CATEGORY_LABELS[category]
    description = (data.get("description") or "").strip()
    if not description:
        description = f"SOS panic alert - immediate {label} assistance requested."

    incident = Incident(
        title=f"SOS - {label}",
        description=description,
        incident_type=IncidentType.SOS,
        latitude=data.get("latitude"),
        longitude=data.get("longitude"),
        location_name=data.get("location_name"),
        author_id=None,
        status=IncidentStatus.UNDER_INVESTIGATION,
    )
    db.session.add(incident)
    db.session.commit()

    _sos_last_seen[ip] = now
    return success(
        {"incident": incident.to_dict()},
        status=201,
        message="SOS alert sent. Emergency responders can see it now.",
    )


@sos_bp.get("/sos/numbers")
def emergency_numbers():
    """Public directory of Kenyan emergency lines shown on the panic screen."""
    return success(
        {
            "numbers": [
                {"label": "National Police Service", "number": "999"},
                {"label": "Emergency (all services)", "number": "112"},
                {"label": "Police (alternative)", "number": "911"},
                {"label": "Kenya Red Cross Ambulance", "number": "1199"},
                {"label": "GBV National Helpline", "number": "1195"},
            ]
        }
    )

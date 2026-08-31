from functools import wraps

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.user import UserRole
from app.services.auth_service import AuthService
from app.services.exceptions import ServiceError
from app.services.incident_service import IncidentService
from app.utils.responses import error, success

admin_bp = Blueprint("admin", __name__)


def admin_required(view):
    @wraps(view)
    @jwt_required()
    def wrapped(*args, **kwargs):
        if get_jwt().get("role") != "admin":
            return error("Administrator access is required.", 403)
        return view(*args, **kwargs)
    return wrapped


@admin_bp.post("/login")
def admin_login():
    payload = request.get_json(silent=True) or {}
    try:
        user, token = AuthService.authenticate_user(
            payload.get("email", payload.get("username", "")),
            payload.get("password", ""),
            required_role=UserRole.ADMIN,
        )
    except ServiceError as err:
        return error(err.message, status=err.status_code)
    return success(
        {"access_token": token, "user": user.to_dict()},
        message="Signed in as administrator.",
    )


@admin_bp.get("/stats")
@admin_required
def incident_stats():
    stats = IncidentService.get_incident_stats()
    stats["sos"] = Incident.query.filter_by(incident_type=IncidentType.SOS).count()
    return success(stats)


@admin_bp.patch("/incidents/<incident_id>/status")
@admin_required
def update_incident_status(incident_id):
    incident = db.session.get(Incident, incident_id)
    if incident is None:
        return error("Incident report not found.", 404)
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in IncidentStatus.ALL:
        return error("Invalid incident status.")
    incident.status = status
    db.session.commit()
    return success(incident.to_dict(), message="Incident status updated.")

from functools import wraps

from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.user import User, UserRole
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
    identifier = str(payload.get("email", payload.get("username", ""))).strip()
    password = payload.get("password", "")
    user = User.query.filter(
        (User.email == identifier.lower()) | (User.username == identifier)
    ).first()

    if user is None or not user.check_password(password):
        return error("Invalid email/username or password.", 401)
    if user.role != UserRole.ADMIN:
        return error("Administrator privileges required.", 403)

    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
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

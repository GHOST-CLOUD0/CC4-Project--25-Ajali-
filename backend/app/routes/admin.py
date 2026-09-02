from functools import wraps

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, jwt_required

from app.models.user import UserRole
from app.services import AuthService, IncidentService, ServiceError
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
    identifier = payload.get("email", payload.get("username", ""))
    try:
        user, token = AuthService.authenticate_user(
            identifier=identifier,
            password=payload.get("password"),
            required_role=UserRole.ADMIN,
        )
        return success(
            {"access_token": token, "user": user.to_dict()},
            message="Signed in as Administrator.",
        )
    except ServiceError as err:
        return error(err.message, err.status_code)


@admin_bp.get("/stats")
@admin_required
def get_stats():
    try:
        stats = IncidentService.get_incident_stats()
        return success(stats, message="Incident statistics retrieved.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@admin_bp.patch("/incidents/<incident_id>/status")
@admin_required
def update_incident_status(incident_id):
    status = (request.get_json(silent=True) or {}).get("status")
    try:
        incident = IncidentService.update_status(incident_id=incident_id, new_status=status)
        return success(incident.to_dict(), message="Incident status updated.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@admin_bp.get("/users")
@admin_required
def list_users():
    from app.models.user import User
    users = User.query.order_by(User.created_at.desc()).all()
    user_list = [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "reports_count": u.incidents.count() if hasattr(u.incidents, "count") else len(u.incidents or []),
        }
        for u in users
    ]
    return success({"users": user_list, "total": len(user_list)})

from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required, verify_jwt_in_request

from app.services import IncidentService, ServiceError
from app.utils.pagination import paginate
from app.utils.responses import error, success

incidents_bp = Blueprint("incidents", __name__)


def _viewer_is_admin() -> bool:
    """True when the request carries a *valid* admin token.

    Soft check: missing/expired/invalid tokens simply read as "not admin",
    so the public feed and detail endpoints keep working for everyone.
    """
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return False
    return get_jwt().get("role") == "admin"


@incidents_bp.get("")
def list_incidents():
    query = IncidentService.get_incidents_query(
        incident_type=request.args.get("incident_type", request.args.get("type")),
        status=request.args.get("status"),
    )
    include_private = _viewer_is_admin()
    items, meta = paginate(
        query, serialize=lambda item: item.to_dict(include_private=include_private)
    )
    return success({"incidents": items}, meta=meta, pagination=meta)


@incidents_bp.post("")
@jwt_required()
def create_incident():
    payload = request.get_json(silent=True) or {}
    try:
        incident = IncidentService.create_incident(
            title=payload.get("title"),
            description=payload.get("description"),
            incident_type=payload.get("incident_type", payload.get("type")),
            location_name=payload.get("location_name", payload.get("location")),
            latitude=payload.get("latitude"),
            longitude=payload.get("longitude"),
            author_id=get_jwt_identity(),
        )
        return success(
            {"incident": incident.to_dict()},
            status=201,
            message="Incident reported successfully.",
        )
    except ServiceError as err:
        return error(err.message, err.status_code)


@incidents_bp.get("/<incident_id>")
def get_incident(incident_id):
    try:
        incident = IncidentService.get_incident(incident_id)
        return success({"incident": incident.to_dict(include_private=_viewer_is_admin())})
    except ServiceError as err:
        return error(err.message, err.status_code)


@incidents_bp.patch("/<incident_id>")
@jwt_required()
def update_incident(incident_id):
    payload = request.get_json(silent=True) or {}
    try:
        incident = IncidentService.update_incident(
            incident_id=incident_id,
            author_id=get_jwt_identity(),
            payload=payload,
        )
        return success({"incident": incident.to_dict()}, message="Incident updated.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@incidents_bp.delete("/<incident_id>")
@jwt_required()
def delete_incident(incident_id):
    claims = get_jwt()
    is_admin = claims.get("role") == "admin"
    try:
        IncidentService.delete_incident(
            incident_id=incident_id,
            author_id=get_jwt_identity(),
            is_admin=is_admin,
        )
        return success(message="Incident report deleted.")
    except ServiceError as err:
        return error(err.message, err.status_code)

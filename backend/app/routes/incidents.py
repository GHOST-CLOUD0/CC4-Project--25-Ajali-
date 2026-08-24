from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.extensions import db
from app.models import Incident, IncidentStatus, Media
from app.utils.decorators import get_current_user
from app.utils.pagination import paginate
from app.utils.responses import error, success
from app.utils.storage import remove_upload
from app.validation.validation import (
    IncidentCreateSchema,
    IncidentGeolocationSchema,
    IncidentListQuerySchema,
    IncidentUpdateSchema,
    validate_json,
    validate_query,
)

incidents_bp = Blueprint("incidents", __name__)


def serialize_incident(incident, *, include_media=False):
    data = incident.to_dict()
    data["author"] = incident.author.username if incident.author else None
    if include_media:
        data["media"] = [
            media.to_dict()
            for media in incident.media.order_by(Media.created_at.asc()).all()
        ]
    else:
        data["media_count"] = incident.media.count()
    return data


def _get_incident_or_404(incident_id):
    incident = db.session.get(Incident, incident_id)
    if incident is None:
        return None, error("Incident report not found.", status=404)
    return incident, None


def _check_can_modify(incident, user):
    if user.is_admin:
        return None
    if incident.author_id != user.id:
        return error("You can only modify your own incident reports.", status=403)
    if not incident.is_editable:
        return error(
            "This report can no longer be changed because it is already "
            f"'{incident.status}'.",
            status=409,
        )
    return None


def _filtered_select(args):
    select = db.select(Incident).order_by(Incident.created_at.desc())
    if args.get("incident_type"):
        select = select.where(Incident.incident_type == args["incident_type"])
    if args.get("status"):
        select = select.where(Incident.status == args["status"])
    if args.get("author_id"):
        select = select.where(Incident.author_id == args["author_id"])
    return select


@incidents_bp.get("")
def list_incidents():
    args = validate_query(IncidentListQuerySchema)
    items, meta = paginate(_filtered_select(args), serialize_incident)
    return success({"incidents": items}, meta=meta)


@incidents_bp.get("/mine")
@jwt_required()
def my_incidents():
    args = validate_query(IncidentListQuerySchema)
    args["author_id"] = get_current_user().id
    items, meta = paginate(_filtered_select(args), serialize_incident)
    return success({"incidents": items}, meta=meta)


@incidents_bp.get("/<incident_id>")
def incident_detail(incident_id):
    incident, failure = _get_incident_or_404(incident_id)
    if failure:
        return failure
    return success({"incident": serialize_incident(incident, include_media=True)})


@incidents_bp.post("")
@jwt_required()
def create_incident():
    payload = validate_json(IncidentCreateSchema)
    user = get_current_user()
    if user is None:
        return error("Account no longer exists.", status=401)

    incident = Incident(
        title=payload["title"].strip(),
        description=payload["description"].strip(),
        incident_type=payload["incident_type"],
        latitude=payload["latitude"],
        longitude=payload["longitude"],
        location_name=payload.get("location_name"),
        status=IncidentStatus.DRAFT,
        author_id=user.id,
    )
    db.session.add(incident)
    db.session.commit()
    return success(
        {"incident": serialize_incident(incident, include_media=True)},
        status=201,
        message="Incident reported successfully.",
    )


@incidents_bp.patch("/<incident_id>")
@jwt_required()
def update_incident(incident_id):
    incident, failure = _get_incident_or_404(incident_id)
    if failure:
        return failure

    denied = _check_can_modify(incident, get_current_user())
    if denied:
        return denied

    payload = validate_json(IncidentUpdateSchema)
    for field in ("title", "description", "incident_type", "location_name"):
        if field in payload:
            value = payload[field]
            setattr(incident, field, value.strip() if isinstance(value, str) else value)
    if "latitude" in payload:
        incident.latitude = payload["latitude"]
    if "longitude" in payload:
        incident.longitude = payload["longitude"]

    db.session.commit()
    return success(
        {"incident": serialize_incident(incident, include_media=True)},
        message="Incident updated successfully.",
    )


@incidents_bp.patch("/<incident_id>/location")
@jwt_required()
def update_location(incident_id):
    incident, failure = _get_incident_or_404(incident_id)
    if failure:
        return failure

    denied = _check_can_modify(incident, get_current_user())
    if denied:
        return denied

    payload = validate_json(IncidentGeolocationSchema)
    incident.set_geolocation(
        payload["latitude"], payload["longitude"], payload.get("location_name")
    )
    db.session.commit()
    return success(
        {"incident": serialize_incident(incident, include_media=True)},
        message="Incident location updated.",
    )


@incidents_bp.delete("/<incident_id>")
@jwt_required()
def delete_incident(incident_id):
    incident, failure = _get_incident_or_404(incident_id)
    if failure:
        return failure

    denied = _check_can_modify(incident, get_current_user())
    if denied:
        return denied

    for media in incident.media.all():
        remove_upload(media.file_path)
    db.session.delete(incident)
    db.session.commit()
    return success(message="Incident report deleted.")
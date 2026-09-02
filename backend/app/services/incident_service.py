# backend/app/services/incident_service.py
from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.media import Media
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError


class IncidentService:
    """Service encapsulating incident report management and admin status lifecycle."""

    @staticmethod
    def validate_coordinates(
        latitude: float | str | None,
        longitude: float | str | None,
    ) -> tuple[float | None, float | None]:
        if latitude is None and longitude is None:
            return None, None
        if latitude is None or longitude is None:
            raise ValidationError("Both latitude and longitude must be provided together.")
        try:
            lat = float(latitude)
            lng = float(longitude)
        except (TypeError, ValueError):
            raise ValidationError("Latitude and longitude must be numbers.")

        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            raise ValidationError("Latitude or longitude is outside its valid range.")

        return lat, lng

    @staticmethod
    def get_incidents_query(incident_type: str | None = None, status: str | None = None):
        select = db.select(Incident).order_by(Incident.created_at.desc())
        if incident_type:
            select = select.where(Incident.incident_type == incident_type)
        if status:
            select = select.where(Incident.status == status)
        return select

    @staticmethod
    def get_incident(incident_id: str) -> Incident:
        incident = db.session.get(Incident, incident_id)
        if incident is None:
            raise NotFoundError("Incident report not found.")
        return incident

    @staticmethod
    def create_incident(
        title: str | None = None,
        description: str | None = None,
        incident_type: str | None = None,
        author_id: str | None = None,
        location: str | None = None,
        location_name: str | None = None,
        latitude: float | str | None = None,
        longitude: float | str | None = None,
        type: str | None = None,
        **extra,
    ) -> Incident:
        title_str = str(title or "").strip()
        desc_str = str(description or "").strip()
        inc_type = str(incident_type or type or "").strip()
        loc = str(location_name or location or "").strip() or None

        if not title_str or not desc_str or not inc_type:
            raise ValidationError("title, description, and incident_type are required.")

        if inc_type not in IncidentType.ALL:
            raise ValidationError("Invalid incident type.")

        lat, lng = IncidentService.validate_coordinates(latitude, longitude)

        incident = Incident(
            title=title_str,
            description=desc_str,
            incident_type=inc_type,
            location_name=loc,
            latitude=lat,
            longitude=lng,
            author_id=author_id,
            status=IncidentStatus.DRAFT,
        )
        db.session.add(incident)
        db.session.commit()
        return incident

    @staticmethod
    def update_incident(incident_id: str, author_id: str, payload: dict) -> Incident:
        incident = IncidentService.get_incident(incident_id)

        if incident.author_id != author_id:
            raise ForbiddenError("You can only edit your own incident reports.")

        if not incident.is_editable:
            raise ForbiddenError(f"Cannot edit incident in '{incident.status}' status.")

        for field in ("title", "description", "location_name"):
            if field in payload:
                value = str(payload[field]).strip()
                if not value:
                    raise ValidationError(f"{field} cannot be empty.")
                setattr(incident, field, value)

        if "location" in payload:
            incident.location_name = str(payload["location"]).strip() or None

        if "incident_type" in payload:
            if payload["incident_type"] not in IncidentType.ALL:
                raise ValidationError("Invalid incident type.")
            incident.incident_type = payload["incident_type"]

        if "type" in payload:
            if payload["type"] not in IncidentType.ALL:
                raise ValidationError("Invalid incident type.")
            incident.incident_type = payload["type"]

        if "latitude" in payload or "longitude" in payload:
            lat, lng = IncidentService.validate_coordinates(
                payload.get("latitude", incident.latitude),
                payload.get("longitude", incident.longitude),
            )
            incident.latitude = lat
            incident.longitude = lng

        db.session.commit()
        return incident

    @staticmethod
    def delete_incident(incident_id: str, author_id: str, is_admin: bool = False) -> None:
        incident = IncidentService.get_incident(incident_id)

        if not is_admin and incident.author_id != author_id:
            raise ForbiddenError("You can only delete your own incident reports.")

        db.session.delete(incident)
        db.session.commit()

    @staticmethod
    def update_status(incident_id: str, new_status: str) -> Incident:
        incident = IncidentService.get_incident(incident_id)

        if new_status not in IncidentStatus.ALL:
            raise ValidationError(f"Invalid incident status '{new_status}'.")

        incident.status = new_status
        db.session.commit()
        return incident

    @staticmethod
    def get_incident_stats() -> dict:
        from app.models.user import User
        total = db.session.scalar(db.select(db.func.count(Incident.id))) or 0
        draft = db.session.scalar(db.select(db.func.count(Incident.id)).where(Incident.status == IncidentStatus.DRAFT)) or 0
        under_inv = db.session.scalar(db.select(db.func.count(Incident.id)).where(Incident.status == IncidentStatus.UNDER_INVESTIGATION)) or 0
        resolved = db.session.scalar(db.select(db.func.count(Incident.id)).where(Incident.status == IncidentStatus.RESOLVED)) or 0
        rejected = db.session.scalar(db.select(db.func.count(Incident.id)).where(Incident.status == IncidentStatus.REJECTED)) or 0
        total_users = db.session.scalar(db.select(db.func.count(User.id))) or 0

        return {
            "total": total,
            "draft": draft,
            "pending": draft,
            "under_investigation": under_inv,
            "resolved": resolved,
            "rejected": rejected,
            "total_users": total_users,
        }
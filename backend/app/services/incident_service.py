from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.media import Media
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError


class IncidentService:
    """Service encapsulating incident report management and admin status lifecycle."""

    @staticmethod
    def validate_coordinates(latitude, longitude) -> tuple[float | None, float | None]:
        if latitude is None and longitude is None:
            return None, None
        try:
            lat = float(latitude)
            lng = float(longitude)
        except (TypeError, ValueError):
            raise ValidationError("Latitude and longitude must be numbers.")

        if not -90 <= lat <= 90 or not -180 <= lng <= 180:
            raise ValidationError("Latitude or longitude is outside its valid range.")

        return lat, lng

    @staticmethod
    def format_incident(incident: Incident) -> dict:
        data = incident.to_dict()
        data["media"] = [item.to_dict() for item in incident.media.order_by(Media.created_at.asc()).all()]
        return data

    @staticmethod
    def get_incidents_query(incident_type: str | None = None, status: str | None = None):
        query = Incident.query.order_by(Incident.created_at.desc())
        if incident_type:
            query = query.filter_by(type=incident_type)
        if status:
            query = query.filter_by(status=status)
        return query

    @staticmethod
    def get_incident(incident_id: str) -> Incident:
        incident = db.session.get(Incident, incident_id)
        if incident is None:
            raise NotFoundError("Incident report not found.")
        return incident

    @staticmethod
    def create_incident(
        title: str,
        description: str,
        incident_type: str,
        location: str,
        author_id: str,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> Incident:
        title = str(title or "").strip()
        description = str(description or "").strip()
        incident_type = str(incident_type or "").strip()
        location = str(location or "").strip()

        if not title or not description or not incident_type or not location:
            raise ValidationError("title, description, type, and location are required.")

        if incident_type not in IncidentType.ALL:
            raise ValidationError("Invalid incident type.")

        lat, lng = IncidentService.validate_coordinates(latitude, longitude)

        incident = Incident(
            title=title,
            description=description,
            incident_type=incident_type,
            location_name=location,
            latitude=lat,
            longitude=lng,
            author_id=author_id,
        )
        db.session.add(incident)
        db.session.commit()
        return incident

    @staticmethod
    def update_incident(incident_id: str, author_id: str, payload: dict) -> Incident:
        incident = IncidentService.get_incident(incident_id)

        if incident.author_id != author_id:
            raise ForbiddenError("You can only edit your own incident reports.")

        for field in ("title", "description"):
            if field in payload:
                value = str(payload[field]).strip()
                if not value:
                    raise ValidationError(f"{field} cannot be empty.")
                setattr(incident, field, value)

        if "location" in payload:
            value = str(payload["location"]).strip()
            if not value:
                raise ValidationError("location cannot be empty.")
            incident.location_name = value

        if "type" in payload:
            incident_type = payload["type"]
            if incident_type not in IncidentType.ALL:
                raise ValidationError("Invalid incident type.")
            incident.incident_type = incident_type

        if "latitude" in payload or "longitude" in payload:
            lat, lng = IncidentService.validate_coordinates(payload.get("latitude"), payload.get("longitude"))
            incident.latitude = lat
            incident.longitude = lng

        db.session.commit()
        return incident

    @staticmethod
    def delete_incident(incident_id: str, author_id: str) -> None:
        incident = IncidentService.get_incident(incident_id)

        if incident.author_id != author_id:
            raise ForbiddenError("You can only delete your own incident reports.")

        db.session.delete(incident)
        db.session.commit()

    @staticmethod
    def update_status(incident_id: str, new_status: str) -> Incident:
        incident = IncidentService.get_incident(incident_id)

        if not new_status or new_status not in IncidentStatus.ALL:
            raise ValidationError("Invalid incident status.")

        incident.status = new_status
        db.session.commit()
        return incident

    @staticmethod
    def get_incident_stats() -> dict:
        total = Incident.query.count()
        draft = Incident.query.filter_by(status=IncidentStatus.DRAFT).count()
        investigating = Incident.query.filter_by(status=IncidentStatus.UNDER_INVESTIGATION).count()
        resolved = Incident.query.filter_by(status=IncidentStatus.RESOLVED).count()
        rejected = Incident.query.filter_by(status=IncidentStatus.REJECTED).count()
        return {
            "total": total,
            "draft": draft,
            "under_investigation": investigating,
            "resolved": resolved,
            "rejected": rejected,
        }

"""Anonymous SOS panic-button alerts (service layer).

These power the public SOS flow: someone in an emergency must be able to
raise an alert and share their live location in seconds, with no account.
"""

from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.services.exceptions import ValidationError
from app.services.incident_service import IncidentService


class SOSService:
    """Business logic for one-tap anonymous emergency alerts."""

    CATEGORY_LABELS = {
        "ambulance": "Ambulance / Medical",
        "accident": "Road Accident",
        "fire": "Fire",
        "crime": "Crime in Progress",
        "flood": "Flood",
        "other": "Other Emergency",
    }

    EMERGENCY_NUMBERS = [
        {"label": "National Police Service", "number": "999"},
        {"label": "Emergency (all services)", "number": "112"},
        {"label": "Police (alternative)", "number": "911"},
        {"label": "Kenya Red Cross Ambulance", "number": "1199"},
        {"label": "GBV National Helpline", "number": "1195"},
    ]

    @staticmethod
    def create_sos(
        category,
        description=None,
        latitude=None,
        longitude=None,
        location_name=None,
    ) -> Incident:
        category = str(category or "").strip().lower()
        if category not in SOSService.CATEGORY_LABELS:
            raise ValidationError(
                "category must be one of: ambulance, accident, fire, crime, flood, other."
            )

        lat, lng = IncidentService.validate_coordinates(latitude, longitude)

        label = SOSService.CATEGORY_LABELS[category]
        description = str(description or "").strip()
        if len(description) > 1000:
            raise ValidationError("Description must be 1000 characters or fewer.")
        if not description:
            description = f"SOS panic alert - immediate {label} assistance requested."

        incident = Incident(
            title=f"SOS - {label}",
            description=description,
            incident_type=IncidentType.SOS,
            latitude=lat,
            longitude=lng,
            location_name=str(location_name or "").strip() or None,
            author_id=None,
            status=IncidentStatus.UNDER_INVESTIGATION,
        )
        db.session.add(incident)
        db.session.commit()
        return incident

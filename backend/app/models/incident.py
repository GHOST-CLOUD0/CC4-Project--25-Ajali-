from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class IncidentType:
    RED_FLAG = "red-flag"
    INTERVENTION = "intervention"
    SOS = "sos"
    ALL = [RED_FLAG, INTERVENTION, SOS]


class IncidentStatus:
    DRAFT = "draft"
    UNDER_INVESTIGATION = "under-investigation"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ALL = [DRAFT, UNDER_INVESTIGATION, RESOLVED, REJECTED]


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.String(80), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    incident_type = db.Column("type", db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=IncidentStatus.DRAFT)
    location_name = db.Column("location", db.String(255), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    author_id = db.Column(db.String(80), db.ForeignKey("users.id"), nullable=True)
    author = db.relationship("User", back_populates="incidents")

    media = db.relationship(
        "Media",
        back_populates="incident",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __init__(self, **kwargs):
        # Accept legacy keyword aliases ("type"/"location") used by older code.
        if "type" in kwargs and "incident_type" not in kwargs:
            kwargs["incident_type"] = kwargs.pop("type")
        if "location" in kwargs and "location_name" not in kwargs:
            kwargs["location_name"] = kwargs.pop("location")
        super().__init__(**kwargs)

    def set_geolocation(self, latitude: float, longitude: float, address=None):
        self.latitude = latitude
        self.longitude = longitude
        if address is not None:
            self.location_name = address

    @property
    def has_geolocation(self):
        return self.latitude is not None and self.longitude is not None

    @property
    def is_editable(self):
        return self.status == IncidentStatus.DRAFT

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "incident_type": self.incident_type,
            "status": self.status,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "author_id": self.author_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Incident {self.id} - {self.title}>"

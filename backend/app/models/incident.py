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

    def __init__(
        self,
        title: str,
        description: str,
        incident_type: str,
        location_name: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        author_id: str | None = None,
        status: str = IncidentStatus.DRAFT,
        **kwargs,
    ):
        super().__init__()
        self.title = title
        self.description = description
        self.incident_type = incident_type
        self.location_name = location_name
        self.latitude = latitude
        self.longitude = longitude
        self.author_id = author_id
        self.status = status
        for key, value in kwargs.items():
            setattr(self, key, value)

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
            "type": self.incident_type,
            "status": self.status,
            "location_name": self.location_name,
            "location": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "author_id": self.author_id,
            "author": self.author.username if self.author else "Anonymous",
            "reporter": self.author.username if self.author else "Anonymous",
            "media": [m.to_dict() for m in self.media.all()] if self.media else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Incident {self.id} - {self.title}>"

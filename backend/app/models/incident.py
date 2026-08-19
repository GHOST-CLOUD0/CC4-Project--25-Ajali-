from datetime import datetime, timezone
from app.extensions import db

class IncidentType:
    RED_FLAG = "red-flag"
    INTERVENTION = "intervention"
    ALL = [RED_FLAG, INTERVENTION]
    
class IncidentStatus:
    DRAFT = "draft"
    UNDER_INVESTIGATION = "under-investigation"
    RESOLVED = "resolved"
    REJECTED = "rejected"
    ALL = [DRAFT, UNDER_INVESTIGATION, RESOLVED, REJECTED]
    
class Incident(db.Model):
    __tablename__ = "incidents"
    
    id = db.Column(db.String(80), unique=True, nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default=IncidentStatus.DRAFT)
    location = db.Column(db.String(255), nullable=False)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.now(timezone.utc),
        onupdate=datetime.now(timezone.utc)
    )
    
    author_id = db.Column(db.String(80), db.ForeignKey("users.id"), nullable=False)
    
    media = db.relationship(
        "Media",
        back_populates="incident",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )  
    
    def set_geolocation(self, latitude: float, longitude: float, address=None):
        self.latitude = latitude
        self.longitude = longitude
        if address is not None:
            self.address = address

    @property
    def has_geolocation(self):
        return self.latitude is not None and self.longitude is not None
    
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "type": self.type,
            "status": self.status,
            "location": self.location,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "author_id": self.author_id
        }

    def __repr__(self):
        return f"<Incident {self.id} - {self.title}>"
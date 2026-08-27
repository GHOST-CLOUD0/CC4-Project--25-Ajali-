from datetime import datetime, timezone
from uuid import uuid4

from app.extensions import db


class MediaType:
    IMAGE = "image"
    VIDEO = "video"
    ALL = [IMAGE, VIDEO]


class Media(db.Model):
    __tablename__ = "media"

    id = db.Column(db.String(80), primary_key=True, default=lambda: str(uuid4()))
    incident_id = db.Column(
        db.String(80), db.ForeignKey("incidents.id"), nullable=False
    )
    media_type = db.Column(db.String(20), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    caption = db.Column(db.String(255), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    incident = db.relationship("Incident", back_populates="media")

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "media_type": self.media_type,
            "file_path": self.file_path,
            "file_name": self.file_name,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "caption": self.caption,
            "url": f"/api/v1/media/{self.id}/file",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Media {self.id} - {self.file_name} for incident {self.incident_id}>"

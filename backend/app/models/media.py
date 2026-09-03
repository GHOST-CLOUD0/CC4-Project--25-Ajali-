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

    def __init__(
        self,
        incident_id: str,
        media_type: str,
        file_path: str,
        file_name: str,
        mime_type: str | None = None,
        file_size: int | None = None,
        caption: str | None = None,
        **kwargs,
    ):
        super().__init__()
        self.incident_id = incident_id
        self.media_type = media_type
        self.file_path = file_path
        self.file_name = file_name
        self.mime_type = mime_type
        self.file_size = file_size
        self.caption = caption
        for key, value in kwargs.items():
            setattr(self, key, value)

    def to_dict(self):
        created = self.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        updated = self.updated_at
        if updated and updated.tzinfo is None:
            updated = updated.replace(tzinfo=timezone.utc)

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
            "created_at": created.isoformat() if created else None,
            "updated_at": updated.isoformat() if updated else None,
        }

    def __repr__(self):
        return f"<Media {self.id} - {self.file_name} for incident {self.incident_id}>"

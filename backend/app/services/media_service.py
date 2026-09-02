from pathlib import Path
from uuid import uuid4

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models.media import Media, MediaType
from app.services.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.services.incident_service import IncidentService


class MediaService:
    """Service encapsulating media file validation, disk storage, and database persistence."""

    @staticmethod
    def get_media_type(filename: str, allowed_images: list[str], allowed_videos: list[str]) -> str | None:
        suffix = Path(filename).suffix.lower().lstrip(".")
        if suffix in allowed_images:
            return MediaType.IMAGE
        if suffix in allowed_videos:
            return MediaType.VIDEO
        return None

    @staticmethod
    def attach_media(
        incident_id: str,
        user_id: str,
        file: FileStorage | None,
        upload_folder: str,
        allowed_images: list[str],
        allowed_videos: list[str],
        max_image_size: int | None = None,
        max_video_size: int | None = None,
    ) -> Media:
        incident = IncidentService.get_incident(incident_id)

        if incident.author_id != user_id:
            raise ForbiddenError("You can only attach media to your own incident reports.")

        if file is None or not getattr(file, "filename", None):
            raise ValidationError("A media file is required.")

        original_name = secure_filename(file.filename)
        media_type = MediaService.get_media_type(original_name, allowed_images, allowed_videos)
        if media_type is None:
            raise ValidationError("Unsupported media file type.")

        upload_directory = Path(upload_folder).resolve()
        upload_directory.mkdir(parents=True, exist_ok=True)
        stored_name = f"{uuid4()}{Path(original_name).suffix.lower()}"
        file_dest = upload_directory / stored_name
        file.save(file_dest)

        import mimetypes
        mime_type = getattr(file, "mimetype", None) or mimetypes.guess_type(original_name)[0]
        file_size = getattr(file, "content_length", None)
        if not file_size and file_dest.exists():
            file_size = file_dest.stat().st_size

        size_limit = max_image_size if media_type == MediaType.IMAGE else max_video_size
        if size_limit and file_size and file_size > size_limit:
            file_dest.unlink(missing_ok=True)
            label = "Images" if media_type == MediaType.IMAGE else "Videos"
            raise ValidationError(f"{label} must be {size_limit // (1024 * 1024)} MB or smaller.")

        media = Media(
            incident_id=incident.id,
            media_type=media_type,
            file_name=original_name,
            file_path=stored_name,
            mime_type=mime_type,
            file_size=file_size,
        )
        db.session.add(media)
        db.session.commit()
        return media

    @staticmethod
    def get_media(media_id: str) -> Media:
        media = db.session.get(Media, media_id)
        if media is None:
            raise NotFoundError("Media not found.")
        return media

    @staticmethod
    def delete_media(media_id: str, user_id: str, upload_folder: str | None = None) -> None:
        media = MediaService.get_media(media_id)
        incident = media.incident

        if incident and incident.author_id != user_id:
            raise ForbiddenError("You can only delete media from your own incident reports.")

        if upload_folder:
            file_path = Path(upload_folder) / media.file_path
            if file_path.exists():
                file_path.unlink()

        db.session.delete(media)
        db.session.commit()


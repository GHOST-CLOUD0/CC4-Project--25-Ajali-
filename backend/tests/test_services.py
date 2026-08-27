import io
import pytest
from werkzeug.datastructures import FileStorage

from app.extensions import db
from app.models.incident import IncidentStatus, IncidentType
from app.models.user import UserRole
from app.services.auth_service import AuthService
from app.services.exceptions import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.services.incident_service import IncidentService
from app.services.media_service import MediaService


def test_auth_service_registration_and_authentication(app):
    with app.app_context():
        # Registration success
        user = AuthService.register_user("service_user", "service@example.com", "strongpassword123")
        assert user.id is not None
        assert user.username == "service_user"

        # Duplicate registration fails
        with pytest.raises(ConflictError):
            AuthService.register_user("service_user", "another@example.com", "strongpassword123")

        with pytest.raises(ConflictError):
            AuthService.register_user("new_user", "service@example.com", "strongpassword123")

        # Invalid password length
        with pytest.raises(ValidationError):
            AuthService.register_user("valid_user", "valid@example.com", "short")

        # Authenticate success
        auth_user, token = AuthService.authenticate_user("service@example.com", "strongpassword123")
        assert auth_user.id == user.id
        assert isinstance(token, str)

        # Authenticate failure
        with pytest.raises(AuthenticationError):
            AuthService.authenticate_user("service@example.com", "wrongpassword")


def test_incident_service_crud_and_permissions(app):
    with app.app_context():
        user1 = AuthService.register_user("author1", "author1@example.com", "password123")
        user2 = AuthService.register_user("author2", "author2@example.com", "password123")

        # Create incident
        incident = IncidentService.create_incident(
            title="Broken Traffic Light",
            description="Signal not changing.",
            incident_type=IncidentType.INTERVENTION,
            location="CBD",
            latitude=-1.286389,
            longitude=36.817223,
            author_id=user1.id,
        )
        assert incident.id is not None
        assert incident.status == IncidentStatus.DRAFT

        # Validation error on bad type
        with pytest.raises(ValidationError):
            IncidentService.create_incident(
                title="Bad Type",
                description="Desc",
                incident_type="invalid-type",
                location="Location",
                author_id=user1.id,
            )

        # Validation error on bad coordinates
        with pytest.raises(ValidationError):
            IncidentService.validate_coordinates("not-a-number", 10.0)

        with pytest.raises(ValidationError):
            IncidentService.validate_coordinates(100.0, 10.0)  # Lat out of range

        # Update by non-author fails
        with pytest.raises(ForbiddenError):
            IncidentService.update_incident(incident.id, user2.id, {"title": "Hacked Title"})

        # Update by author succeeds
        updated = IncidentService.update_incident(incident.id, user1.id, {"title": "Updated Traffic Light"})
        assert updated.title == "Updated Traffic Light"

        # Update status
        status_updated = IncidentService.update_status(incident.id, IncidentStatus.UNDER_INVESTIGATION)
        assert status_updated.status == IncidentStatus.UNDER_INVESTIGATION

        # Delete by non-author fails
        with pytest.raises(ForbiddenError):
            IncidentService.delete_incident(incident.id, user2.id)

        # Delete by author succeeds
        IncidentService.delete_incident(incident.id, user1.id)
        with pytest.raises(NotFoundError):
            IncidentService.get_incident(incident.id)


def test_media_service_operations(app, tmp_path):
    with app.app_context():
        user = AuthService.register_user("media_user", "media@example.com", "password123")
        other_user = AuthService.register_user("other_media_user", "other@example.com", "password123")

        incident = IncidentService.create_incident(
            title="Pothole",
            description="Deep pothole on highway",
            incident_type=IncidentType.RED_FLAG,
            location="Highway",
            author_id=user.id,
        )

        allowed_images = ["png", "jpg", "jpeg"]
        allowed_videos = ["mp4"]

        # Unsupported media type
        dummy_file = FileStorage(
            stream=io.BytesIO(b"fake data"),
            filename="document.pdf",
            content_type="application/pdf",
        )
        with pytest.raises(ValidationError):
            MediaService.attach_media(
                incident_id=incident.id,
                user_id=user.id,
                file=dummy_file,
                upload_folder=str(tmp_path),
                allowed_images=allowed_images,
                allowed_videos=allowed_videos,
            )

        # Non-author cannot attach media
        valid_img = FileStorage(
            stream=io.BytesIO(b"fake image bytes"),
            filename="photo.jpg",
            content_type="image/jpeg",
        )
        with pytest.raises(ForbiddenError):
            MediaService.attach_media(
                incident_id=incident.id,
                user_id=other_user.id,
                file=valid_img,
                upload_folder=str(tmp_path),
                allowed_images=allowed_images,
                allowed_videos=allowed_videos,
            )

        # Successful attach
        valid_img.stream.seek(0)
        media = MediaService.attach_media(
            incident_id=incident.id,
            user_id=user.id,
            file=valid_img,
            upload_folder=str(tmp_path),
            allowed_images=allowed_images,
            allowed_videos=allowed_videos,
        )
        assert media.id is not None
        assert media.file_name == "photo.jpg"
        assert (tmp_path / media.file_path).exists()


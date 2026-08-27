import mimetypes
import os

from flask import Blueprint, current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from app.extensions import db
from app.models import Incident, Media, MediaType
from app.utils.decorators import get_current_user
from app.utils.responses import error, success
from app.utils.storage import remove_upload, save_upload
from app.validation.validation import validate_media_file

media_bp = Blueprint("media", __name__)


def _media_type_for(filename):
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]:
        return MediaType.IMAGE, extension
    if extension in current_app.config["ALLOWED_VIDEO_EXTENSIONS"]:
        return MediaType.VIDEO, extension
    return None, extension


def _measure_size(file_storage):
    stream = file_storage.stream
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(0)
    return size


@media_bp.post("/incidents/<incident_id>/media")
@jwt_required()
def upload_media(incident_id):
    incident = db.session.get(Incident, incident_id)
    if incident is None:
        return error("Incident report not found.", status=404)
    if incident.author_id != get_jwt_identity():
        return error(
            "You can only attach media to your own incident reports.", status=403
        )
    if not incident.is_editable:
        return error(
            "Media can only be added while the report is still a draft.", status=409
        )

    uploaded_file = request.files.get("file")
    if uploaded_file is None or not uploaded_file.filename:
        return error("A media file is required.")

    original_name = secure_filename(uploaded_file.filename)
    media_type, extension = _media_type_for(original_name)
    if media_type is None:
        allowed = sorted(
            current_app.config["ALLOWED_IMAGE_EXTENSIONS"]
            | current_app.config["ALLOWED_VIDEO_EXTENSIONS"]
        )
        return error(
            f"Unsupported media file type. Allowed extensions: {', '.join(allowed)}.",
            status=400,
        )

    mime_type = uploaded_file.mimetype
    if not mime_type or mime_type == "application/octet-stream":
        mime_type = mimetypes.guess_type(original_name)[0] or mime_type

    size = _measure_size(uploaded_file)
    validate_media_file(media_type, mime_type or "", size)

    relative_path, stored_size = save_upload(
        uploaded_file, incident_id=incident.id, extension=extension
    )

    media = Media(
        incident_id=incident.id,
        media_type=media_type,
        file_name=original_name,
        file_path=relative_path,
        mime_type=mime_type,
        file_size=stored_size,
        caption=(request.form.get("caption") or None),
    )
    db.session.add(media)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        remove_upload(relative_path)
        raise

    return success({"media": media.to_dict()}, status=201, message="Media uploaded.")


@media_bp.get("/incidents/<incident_id>/media")
def list_media(incident_id):
    incident = db.session.get(Incident, incident_id)
    if incident is None:
        return error("Incident report not found.", status=404)
    items = [
        media.to_dict()
        for media in incident.media.order_by(Media.created_at.asc()).all()
    ]
    return success({"media": items})


@media_bp.delete("/media/<media_id>")
@jwt_required()
def delete_media(media_id):
    media = db.session.get(Media, media_id)
    if media is None:
        return error("Media not found.", status=404)

    user = get_current_user()
    if user is None:
        return error("Account no longer exists.", status=401)

    is_owner = media.incident.author_id == user.id
    if not is_owner and not user.is_admin:
        return error("You can only remove media from your own incident reports.", status=403)
    if is_owner and not user.is_admin and not media.incident.is_editable:
        return error(
            "Media can only be removed while the report is still a draft.", status=409
        )

    remove_upload(media.file_path)
    db.session.delete(media)
    db.session.commit()
    return success(message="Media deleted.")


@media_bp.get("/media/<media_id>/file")
def media_file(media_id):
    media = db.session.get(Media, media_id)
    if media is None or not media.file_path:
        return error("Media not found.", status=404)
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        media.file_path,
        mimetype=media.mime_type,
    )

from flask import Blueprint, current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Incident, Media
from app.services import MediaService, ServiceError
from app.utils.responses import error, success

media_bp = Blueprint("media", __name__)


@media_bp.post("/incidents/<incident_id>/media")
@jwt_required()
def upload_media(incident_id):
    try:
        media = MediaService.attach_media(
            incident_id=incident_id,
            user_id=get_jwt_identity(),
            file=request.files.get("file"),
            upload_folder=current_app.config["UPLOAD_FOLDER"],
            allowed_images=list(current_app.config["ALLOWED_IMAGE_EXTENSIONS"]),
            allowed_videos=list(current_app.config["ALLOWED_VIDEO_EXTENSIONS"]),
        )
        return success({"media": media.to_dict()}, status=201, message="Media uploaded.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@media_bp.get("/incidents/<incident_id>/media")
def list_media(incident_id):
    incident = Incident.query.get(incident_id)
    if incident is None:
        return error("Incident report not found.", status=404)
    items = [media.to_dict() for media in incident.media.order_by(Media.created_at.asc()).all()]
    return success({"media": items})


@media_bp.delete("/media/<media_id>")
@jwt_required()
def delete_media(media_id):
    try:
        MediaService.delete_media(
            media_id=media_id,
            user_id=get_jwt_identity(),
            upload_folder=current_app.config.get("UPLOAD_FOLDER"),
        )
        return success(message="Media deleted.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@media_bp.get("/media/<media_id>/file")
def media_file(media_id):
    try:
        media = MediaService.get_media(media_id)
        return send_from_directory(
            current_app.config["UPLOAD_FOLDER"],
            media.file_path,
            mimetype=media.mime_type,
        )
    except ServiceError as err:
        return error(err.message, err.status_code)

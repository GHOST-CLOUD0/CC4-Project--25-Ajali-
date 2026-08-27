from flask import Blueprint, current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required

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
            allowed_images=current_app.config["ALLOWED_IMAGE_EXTENSIONS"],
            allowed_videos=current_app.config["ALLOWED_VIDEO_EXTENSIONS"],
        )
        return success(media.to_dict(), 201, message="Media uploaded.")
    except ServiceError as err:
        return error(err.message, err.status_code)

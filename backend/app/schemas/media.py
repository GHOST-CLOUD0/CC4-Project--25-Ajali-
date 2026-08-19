from marshmallow import validate

from app.extensions import ma
from app.models.media import Media, MediaType


class MediaSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a Media item (image/video evidence)."""
    id = ma.String(dump_only=True)
    incident_id = ma.String(dump_only=True)
    media_type = ma.String(validate=validate.OneOf(MediaType.ALL))
    file_path = ma.String(dump_only=True)
    created_at = ma.DateTime(dump_only=True)
    updated_at = ma.DateTime(dump_only=True)

    class Meta:
        model = Media
        load_instance = True
        include_fk = True
        exclude = ("incident",)

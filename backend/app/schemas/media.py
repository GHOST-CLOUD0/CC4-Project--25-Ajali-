from marshmallow import validate

from app.extensions import ma
from app.models.media import Media, MediaType


class MediaSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a Media item (image/video evidence)."""
    media_type = ma.String(validate=validate.OneOf(MediaType.ALL))

    class Meta:
        model = Media
        load_instance = True
        include_fk = True
        exclude = ("incident",)
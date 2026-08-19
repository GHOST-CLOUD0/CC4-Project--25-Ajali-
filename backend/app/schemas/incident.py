from marshmallow import validate

from app.extensions import ma
from app.models.incident import Incident, IncidentStatus, IncidentType

from .media import MediaSchema


class IncidentSchema(ma.SQLAlchemyAutoSchema):
    """Serializes an Incident (red-flag / intervention record)."""
    media = ma.Nested(MediaSchema, many=True, dump_only=True)

    type = ma.String(validate=validate.OneOf(IncidentType.ALL))
    status = ma.String(validate=validate.OneOf(IncidentStatus.ALL))

    class Meta:
        model = Incident
        load_instance = True
        include_fk = True   # exposes author_id
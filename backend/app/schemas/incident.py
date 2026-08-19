from marshmallow import validate

from app.extensions import ma
from app.models.incident import Incident, IncidentStatus, IncidentType

from .media import MediaSchema


class IncidentSchema(ma.SQLAlchemyAutoSchema):
    """Serializes an Incident (red-flag / intervention record)."""
    id = ma.String(dump_only=True)
    author_id = ma.String(dump_only=True)
    status = ma.String(dump_only=True)
    created_at = ma.DateTime(dump_only=True)
    updated_at = ma.DateTime(dump_only=True)
    media = ma.Nested(MediaSchema, many=True, dump_only=True)

    type = ma.String(validate=validate.OneOf(IncidentType.ALL))
    latitude = ma.Float(validate=validate.Range(min=-90, max=90), allow_none=True)
    longitude = ma.Float(validate=validate.Range(min=-180, max=180), allow_none=True)

    class Meta:
        model = Incident
        load_instance = True
        include_fk = True


class IncidentStatusUpdateSchema(ma.Schema):
    """Validates an administrator's incident-status update."""
    status = ma.String(required=True, validate=validate.OneOf(IncidentStatus.ALL))

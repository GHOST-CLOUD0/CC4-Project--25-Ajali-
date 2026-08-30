"""Ajali! backend request/response validation (Marshmallow).

Single module for auth, incidents, media, admin, and Flask helpers.

Usage:
    from app.schemas.validation import IncidentCreateSchema, validate_json

    data = validate_json(IncidentCreateSchema)
"""

from functools import wraps

from flask import request
from marshmallow import Schema, ValidationError, fields, post_load, validate, validates, validates_schema

from app.utils.responses import error as error_response

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

INCIDENT_TYPES = ("red-flag", "intervention", "sos")
SOS_CATEGORIES = ("ambulance", "accident", "fire", "crime", "flood", "other")
INCIDENT_STATUSES = ("draft", "under-investigation", "rejected", "resolved")
ADMIN_STATUSES = ("under-investigation", "rejected", "resolved")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserRegisterSchema(Schema):
    """POST /auth/register"""

    username = fields.String(
        required=True,
        validate=[
            validate.Length(min=3, max=50),
            validate.Regexp(
                r"^[a-zA-Z0-9_]+$",
                error="Username may only contain letters, numbers, and underscores.",
            ),
        ],
    )
    email = fields.Email(required=True)
    password = fields.String(
        required=True,
        load_only=True,
        validate=validate.Length(min=8, max=128),
    )
    confirm_password = fields.String(required=True, load_only=True)
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=80))
    phone = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Regexp(
            r"^(\+254|0)[17]\d{8}$",
            error="Phone must be a valid Kenyan number (e.g. +254712345678 or 0712345678).",
        ),
    )

    @validates_schema
    def passwords_match(self, data, **kwargs):
        if data.get("password") != data.get("confirm_password"):
            raise ValidationError("Passwords do not match.", field_name="confirm_password")


class UserLoginSchema(Schema):
    """POST /auth/login — email or username plus password."""

    identifier = fields.String(required=True, metadata={"description": "Email or username"})
    password = fields.String(required=True, load_only=True)


class UserResponseSchema(Schema):
    """Safe user payload (never expose password hash)."""

    id = fields.Integer(dump_only=True)
    username = fields.String()
    email = fields.Email()
    first_name = fields.String()
    last_name = fields.String()
    phone = fields.String(allow_none=True)
    role = fields.String()
    created_at = fields.DateTime(dump_only=True)


# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------


class IncidentCreateSchema(Schema):
    """POST /incidents — accepts canonical names and legacy aliases (type/location)."""

    title = fields.String(required=True, validate=validate.Length(min=5, max=200))
    description = fields.String(required=True, validate=validate.Length(min=20, max=5000))
    incident_type = fields.String(
        required=False,
        validate=validate.OneOf(
            INCIDENT_TYPES,
            error="incident_type must be 'red-flag', 'intervention', or 'sos'.",
        ),
    )
    type = fields.String(  # legacy alias for incident_type
        required=False,
        validate=validate.OneOf(
            INCIDENT_TYPES,
            error="type must be 'red-flag', 'intervention', or 'sos'.",
        ),
    )
    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    location_name = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    location = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))  # legacy alias

    @validates_schema
    def require_type(self, data, **kwargs):
        if not data.get("incident_type") and not data.get("type"):
            raise ValidationError("incident_type is required.", field_name="incident_type")

    @post_load
    def normalize_aliases(self, data, **kwargs):
        if data.get("type") and not data.get("incident_type"):
            data["incident_type"] = data["type"]
        if data.get("location") and not data.get("location_name"):
            data["location_name"] = data["location"]
        data.pop("type", None)
        data.pop("location", None)
        return data

    @validates("latitude")
    def validate_latitude(self, value, **kwargs):
        if value < -90 or value > 90:
            raise ValidationError("Latitude must be between -90 and 90.")

    @validates("longitude")
    def validate_longitude(self, value, **kwargs):
        if value < -180 or value > 180:
            raise ValidationError("Longitude must be between -180 and 180.")


class IncidentUpdateSchema(Schema):
    """PATCH /incidents/<id>"""

    title = fields.String(validate=validate.Length(min=5, max=200))
    description = fields.String(validate=validate.Length(min=20, max=5000))
    incident_type = fields.String(
        validate=validate.OneOf(
            INCIDENT_TYPES,
            error="incident_type must be 'red-flag' or 'intervention'.",
        ),
    )
    latitude = fields.Float()
    longitude = fields.Float()
    location_name = fields.String(allow_none=True, validate=validate.Length(max=255))

    @validates("latitude")
    def validate_latitude(self, value, **kwargs):
        if value is not None and (value < -90 or value > 90):
            raise ValidationError("Latitude must be between -90 and 90.")

    @validates("longitude")
    def validate_longitude(self, value, **kwargs):
        if value is not None and (value < -180 or value > 180):
            raise ValidationError("Longitude must be between -180 and 180.")

    @validates_schema
    def at_least_one_field(self, data, **kwargs):
        if not data:
            raise ValidationError("Provide at least one field to update.")


class IncidentGeolocationSchema(Schema):
    """PATCH /incidents/<id>/location"""

    latitude = fields.Float(required=True)
    longitude = fields.Float(required=True)
    location_name = fields.String(allow_none=True, validate=validate.Length(max=255))

    @validates("latitude")
    def validate_latitude(self, value, **kwargs):
        if value < -90 or value > 90:
            raise ValidationError("Latitude must be between -90 and 90.")

    @validates("longitude")
    def validate_longitude(self, value, **kwargs):
        if value < -180 or value > 180:
            raise ValidationError("Longitude must be between -180 and 180.")


class SOSSchema(Schema):
    """POST /sos — anonymous panic-button alert (no login required)."""

    category = fields.String(
        required=True,
        validate=validate.OneOf(
            SOS_CATEGORIES,
            error="category must be one of: ambulance, accident, fire, crime, flood, other.",
        ),
    )
    description = fields.String(required=False, allow_none=True, validate=validate.Length(max=1000))
    latitude = fields.Float(required=False, allow_none=True)
    longitude = fields.Float(required=False, allow_none=True)
    location_name = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))

    @validates("latitude")
    def validate_sos_latitude(self, value, **kwargs):
        if value is not None and (value < -90 or value > 90):
            raise ValidationError("Latitude must be between -90 and 90.")

    @validates("longitude")
    def validate_sos_longitude(self, value, **kwargs):
        if value is not None and (value < -180 or value > 180):
            raise ValidationError("Longitude must be between -180 and 180.")

    @validates_schema
    def coordinates_together(self, data, **kwargs):
        if (data.get("latitude") is None) != (data.get("longitude") is None):
            raise ValidationError("latitude and longitude must be sent together.")


class IncidentListQuerySchema(Schema):
    """GET /incidents — paginated filters."""

    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=10, validate=validate.Range(min=1, max=100))
    incident_type = fields.String(required=False, validate=validate.OneOf(INCIDENT_TYPES))
    status = fields.String(required=False, validate=validate.OneOf(INCIDENT_STATUSES))
    author_id = fields.String(required=False)


class IncidentResponseSchema(Schema):
    id = fields.Integer(dump_only=True)
    title = fields.String()
    description = fields.String()
    incident_type = fields.String()
    status = fields.String()
    latitude = fields.Float()
    longitude = fields.Float()
    location_name = fields.String(allow_none=True)
    user_id = fields.Integer()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


# ---------------------------------------------------------------------------
# Media
# ---------------------------------------------------------------------------


class MediaUploadSchema(Schema):
    """Metadata for POST /incidents/<id>/media (file is multipart)."""

    media_type = fields.String(required=True, validate=validate.OneOf(("image", "video")))
    caption = fields.String(required=False, allow_none=True, validate=validate.Length(max=255))
    mime_type = fields.String(required=True)
    file_size = fields.Integer(required=True, validate=validate.Range(min=1))

    @validates("mime_type")
    def validate_mime(self, value, **kwargs):
        if value not in ALLOWED_MEDIA_TYPES:
            raise ValidationError(
                f"Unsupported file type '{value}'. "
                "Images: JPEG, PNG, GIF, WebP. Videos: MP4, WebM, QuickTime."
            )

    @validates("file_size")
    def validate_size(self, value, **kwargs):
        if value > MAX_VIDEO_BYTES:
            raise ValidationError("File exceeds the 50 MB maximum.")


def validate_media_file(media_type: str, mime_type: str, file_size: int) -> None:
    """Raise ValidationError if type/size combination is invalid."""
    if media_type == "image":
        if mime_type not in ALLOWED_IMAGE_TYPES:
            raise ValidationError("Image must be JPEG, PNG, GIF, or WebP.")
        if file_size > MAX_IMAGE_BYTES:
            raise ValidationError("Images must be 5 MB or smaller.")
    elif media_type == "video":
        if mime_type not in ALLOWED_VIDEO_TYPES:
            raise ValidationError("Video must be MP4, WebM, or QuickTime.")
        if file_size > MAX_VIDEO_BYTES:
            raise ValidationError("Videos must be 50 MB or smaller.")
    else:
        raise ValidationError("media_type must be 'image' or 'video'.")


class MediaResponseSchema(Schema):
    id = fields.Integer(dump_only=True)
    incident_id = fields.Integer()
    media_type = fields.String()
    url = fields.String()
    caption = fields.String(allow_none=True)
    mime_type = fields.String()
    created_at = fields.DateTime(dump_only=True)


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


class AdminStatusUpdateSchema(Schema):
    """PATCH /admin/incidents/<id>/status"""

    status = fields.String(
        required=True,
        validate=validate.OneOf(
            ADMIN_STATUSES,
            error="Status must be 'under-investigation', 'rejected', or 'resolved'.",
        ),
    )
    comment = fields.String(
        required=False,
        allow_none=True,
        validate=validate.Length(max=1000),
        metadata={"description": "Reason for rejection or resolution notes."},
    )

    @validates_schema
    def require_comment_on_reject(self, data, **kwargs):
        if data.get("status") == "rejected" and not (data.get("comment") or "").strip():
            raise ValidationError(
                "A comment is required when rejecting a false claim.",
                field_name="comment",
            )


# ---------------------------------------------------------------------------
# Flask helpers
# ---------------------------------------------------------------------------


def validate_json(schema: type[Schema] | Schema, *, partial: bool = False) -> dict:
    """Load and validate JSON body. Raises ValidationError."""
    instance = schema if isinstance(schema, Schema) else schema()
    payload = request.get_json(silent=True)
    if payload is None:
        raise ValidationError({"_schema": ["Request body must be valid JSON."]})
    return instance.load(payload, partial=partial)


def validate_query(schema: type[Schema] | Schema) -> dict:
    """Load and validate query-string args."""
    instance = schema if isinstance(schema, Schema) else schema()
    return instance.load(request.args.to_dict())


def validate_request(schema: type[Schema] | Schema, *, source: str = "json"):
    """Decorator: pass validated payload as `validated` kwarg."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            instance = schema if isinstance(schema, Schema) else schema()
            try:
                if source == "query":
                    data = instance.load(request.args.to_dict())
                else:
                    payload = request.get_json(silent=True)
                    if payload is None:
                        raise ValidationError({"_schema": ["Request body must be valid JSON."]})
                    data = instance.load(payload)
            except ValidationError as err:
                return error_response(
                    "Validation failed.", status=400, errors=err.messages
                )
            return fn(*args, validated=data, **kwargs)

        return wrapper

    return decorator


def register_validation_error_handler(app):
    """Call from create_app() so ValidationError becomes 400 JSON."""

    @app.errorhandler(ValidationError)
    def handle_validation_error(err):
        return error_response("Validation failed.", status=400, errors=err.messages)

from app.extensions import ma
from app.models.user import User


class UserSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a User. password_hash is never exposed; password is write-only."""
    id = ma.String(dump_only=True)
    password = ma.String(load_only=True, required=False)
    role = ma.String(dump_only=True)
    created_at = ma.DateTime(dump_only=True)
    updated_at = ma.DateTime(dump_only=True)

    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash", "incidents")

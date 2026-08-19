from app.extensions import ma
from app.models.user import User


class UserSchema(ma.SQLAlchemyAutoSchema):
    """Serializes a User. password_hash is never exposed; password is write-only."""
    password = ma.String(load_only=True, required=False)

    class Meta:
        model = User
        load_instance = True
        exclude = ("password_hash", "incidents")
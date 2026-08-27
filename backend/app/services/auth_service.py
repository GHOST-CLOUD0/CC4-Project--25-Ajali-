from datetime import timedelta

from flask_jwt_extended import create_access_token, decode_token

from app.extensions import db
from app.models.user import User, UserRole
from app.services.exceptions import (
    AuthenticationError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)


class AuthService:
    """Service encapsulating user registration, authentication, and identity operations."""

    @staticmethod
    def register_user(username: str, email: str, password: str, role: str = UserRole.CITIZEN) -> User:
        username = str(username or "").strip()
        email = str(email or "").strip().lower()
        password = str(password or "")

        if not username or not email or not password:
            raise ValidationError("username, email, and password are required.")

        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long.")

        existing_user = User.query.filter((User.username == username) | (User.email == email)).first()
        if existing_user is not None:
            raise ConflictError("A user with that username or email already exists.")

        user = User(username=username, email=email, role=role)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def authenticate_user(identifier: str, password: str, required_role: str | None = None) -> tuple[User, str]:
        identifier = str(identifier or "").strip()
        password = str(password or "")

        if not identifier or not password:
            raise AuthenticationError("Invalid email/username or password.")

        user = User.query.filter((User.email == identifier.lower()) | (User.username == identifier)).first()

        if user is None or not user.check_password(password):
            raise AuthenticationError("Invalid email/username or password.")

        if required_role is not None:
            if required_role == UserRole.ADMIN and user.role != UserRole.ADMIN:
                raise ForbiddenError("Access denied. Administrator privileges required.")
            elif required_role == UserRole.CITIZEN and user.role == UserRole.ADMIN:
                raise ForbiddenError("Admin account detected. Please sign in via the Admin Responder Portal.")

        token = create_access_token(identity=user.id, additional_claims={"role": user.role})
        return user, token

    @staticmethod
    def get_user_by_id(user_id: str) -> User:
        user = db.session.get(User, user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    @staticmethod
    def request_password_reset(email: str) -> tuple[User | None, str | None]:
        email = str(email or "").strip().lower()
        if not email:
            raise ValidationError("Email address is required.")

        user = User.query.filter_by(email=email).first()
        if user is None:
            # Return None to allow caller to respond neutrally without leaking whether email exists
            return None, None

        reset_token = create_access_token(
            identity=user.id,
            expires_delta=timedelta(minutes=15),
            additional_claims={"type": "password_reset"},
        )
        return user, reset_token

    @staticmethod
    def reset_password(token: str, new_password: str) -> User:
        token = str(token or "").strip()
        new_password = str(new_password or "")

        if not token:
            raise ValidationError("Reset token is required.")

        if not new_password or len(new_password) < 8:
            raise ValidationError("New password must be at least 8 characters long.")

        try:
            decoded = decode_token(token)
            if decoded.get("type") != "password_reset":
                raise ValidationError("Invalid password reset token.")
            user_id = decoded.get("sub")
        except ValidationError:
            raise
        except Exception:
            raise ValidationError("Invalid or expired password reset token.")

        user = db.session.get(User, user_id)
        if user is None:
            raise NotFoundError("User associated with reset token was not found.")

        user.set_password(new_password)
        db.session.commit()
        return user

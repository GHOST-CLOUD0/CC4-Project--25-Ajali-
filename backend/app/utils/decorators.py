from functools import wraps

from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from app.extensions import db
from app.models.user import User, UserRole
from app.utils.responses import error


def get_current_user():
    identity = get_jwt_identity()
    if identity is None:
        return None
    return db.session.get(User, identity)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get("role") != UserRole.ADMIN:
            return error("Administrator access is required.", status=403)
        return fn(*args, **kwargs)

    return wrapper

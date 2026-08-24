from flask import Blueprint, request
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models.user import User
from app.utils.responses import error, success

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    password = payload.get("password", "")

    if not username or not email or not password:
        return error("username, email, and password are required.")
    if len(password) < 8:
        return error("Password must be at least 8 characters long.")
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return error("A user with that username or email already exists.", 409)

    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return success(user.to_dict(), 201, message="Account created.")


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    identifier = str(payload.get("email", payload.get("username", ""))).strip()
    password = payload.get("password", "")
    user = User.query.filter((User.email == identifier.lower()) | (User.username == identifier)).first()

    if user is None or not user.check_password(password):
        return error("Invalid email/username or password.", 401)

    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    return success({"access_token": token, "user": user.to_dict()}, message="Signed in.")

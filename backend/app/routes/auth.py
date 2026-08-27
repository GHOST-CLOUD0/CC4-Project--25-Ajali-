from flask import Blueprint, request

from app.services import AuthService, ServiceError
from app.utils.responses import error, success

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    try:
        user = AuthService.register_user(
            username=payload.get("username"),
            email=payload.get("email"),
            password=payload.get("password"),
        )
        return success(user.to_dict(), 201, message="Account created.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    identifier = payload.get("email", payload.get("username", ""))
    try:
        user, token = AuthService.authenticate_user(
            identifier=identifier,
            password=payload.get("password"),
        )
        return success({"access_token": token, "user": user.to_dict()}, message="Signed in.")
    except ServiceError as err:
        return error(err.message, err.status_code)


@auth_bp.post("/forgot-password")
def forgot_password():
    payload = request.get_json(silent=True) or {}
    email = payload.get("email")
    try:
        user, reset_token = AuthService.request_password_reset(email=email)
        data = {"reset_token": reset_token} if reset_token else None
        return success(
            data=data,
            message="If an account with that email exists, password reset instructions have been generated.",
        )
    except ServiceError as err:
        return error(err.message, err.status_code)


@auth_bp.post("/reset-password")
def reset_password():
    payload = request.get_json(silent=True) or {}
    token = payload.get("token")
    new_password = payload.get("new_password", payload.get("password"))
    try:
        AuthService.reset_password(token=token, new_password=new_password)
        return success(message="Password reset successfully. You can now log in with your new password.")
    except ServiceError as err:
        return error(err.message, err.status_code)

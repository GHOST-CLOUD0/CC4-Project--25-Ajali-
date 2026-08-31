from flask import Flask, jsonify

from app.config import config_by_name
from app.extensions import cors, db, jwt, ma, migrate


def create_app(config_name="development"):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    db.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    register_blueprints(app)
    register_error_handlers(app)
    register_jwt_handlers()

    from app.validation.validation import register_validation_error_handler

    register_validation_error_handler(app)

    with app.app_context():
        from app.models import Incident, Media, User  # noqa: F401
        db.create_all()

    @app.get("/api/v1/health")
    def health():
        return jsonify(status="ok", service="ajali-backend"), 200

    return app


def register_blueprints(app):
    from app.routes.auth import auth_bp
    from app.routes.incidents import incidents_bp
    from app.routes.media import media_bp
    from app.routes.admin import admin_bp
    from app.routes.sos import sos_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(incidents_bp, url_prefix="/api/v1/incidents")
    app.register_blueprint(media_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(sos_bp, url_prefix="/api/v1")


def register_error_handlers(app):

    @app.errorhandler(404)
    def not_found(error):
        return jsonify(status="error", message="Resource not found."), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify(status="error", message="Method not allowed."), 405

    @app.errorhandler(413)
    def payload_too_large(error):
        return jsonify(status="error", message="File is too large."), 413

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify(status="error", message="Internal server error."), 500


def register_jwt_handlers():

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify(status="error", message="Access token has expired."), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(reason):
        return jsonify(status="error", message=f"Invalid token: {reason}"), 422

    @jwt.unauthorized_loader
    def missing_token_callback(reason):
        return jsonify(status="error", message=f"Missing token: {reason}"), 401

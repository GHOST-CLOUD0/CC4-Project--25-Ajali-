# Production WSGI entrypoint — hosts run it as:  gunicorn wsgi:app
from app import create_app
from app.extensions import db

app = create_app("production")

# The project has no migration history (the golden path is db.create_all),
# so make first boot against a fresh database self-initialising.
# create_all is idempotent (CREATE TABLE IF NOT EXISTS), so restarts are safe.
with app.app_context():
    db.create_all()

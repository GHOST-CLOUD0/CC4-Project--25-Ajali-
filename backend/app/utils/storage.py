import os
import uuid

from flask import current_app


def save_upload(file_storage, *, incident_id, extension=None):
    ext = (extension or "bin").lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    relative_path = f"{incident_id}/{filename}"
    absolute_path = os.path.join(current_app.config["UPLOAD_FOLDER"], relative_path)
    os.makedirs(os.path.dirname(absolute_path), exist_ok=True)

    file_storage.save(absolute_path)
    size = os.path.getsize(absolute_path)
    return relative_path, size


def upload_abspath(relative_path):
    return os.path.join(current_app.config["UPLOAD_FOLDER"], relative_path)


def remove_upload(relative_path):
    if not relative_path:
        return
    try:
        os.remove(upload_abspath(relative_path))
    except OSError:
        pass

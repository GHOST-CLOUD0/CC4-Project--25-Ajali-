import io
import pytest

def get_auth_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "media_test_user", "email": "media@example.com", "password": "password123"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "media@example.com", "password": "password123"},
    )
    return res.get_json()["data"]["access_token"]

def test_upload_image_media(client, tmp_path, app):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    token = get_auth_token(client)

    incident = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Accident Scene", "description": "Accident report.", "incident_type": "red-flag", "latitude": -1.2, "longitude": 36.8},
    ).get_json()["data"]["incident"]

    data = {
        "file": (io.BytesIO(b"fake image data"), "evidence.jpg"),
        "caption": "Photo from roadside",
    }
    res = client.post(
        f"/api/v1/incidents/{incident['id']}/media",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data",
    )
    assert res.status_code == 201

def test_upload_unsupported_file_rejected(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    token = get_auth_token(client)
    incident = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Accident Scene", "description": "Accident report.", "incident_type": "red-flag", "latitude": -1.2, "longitude": 36.8},
    ).get_json()["data"]["incident"]

    data = {"file": (io.BytesIO(b"fake pdf"), "report.pdf")}
    res = client.post(
        f"/api/v1/incidents/{incident['id']}/media",
        headers={"Authorization": f"Bearer {token}"},
        data=data,
        content_type="multipart/form-data",
    )
    assert res.status_code == 400

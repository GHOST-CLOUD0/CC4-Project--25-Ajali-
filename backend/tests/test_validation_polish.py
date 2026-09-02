# backend/tests/test_validation_polish.py
"""Regression tests for the hardening passes:
- /incidents validation (lengths, sos-bypass)
- media size limits
- media file serving (absolute upload folder)
"""
import io


def get_auth_token(client, email="polish@ajali.dev", username="polishuser"):
    client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": "pass12345",
              "confirm_password": "pass12345"},
    )
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "pass12345"})
    return res.get_json()["data"]["access_token"]


def create_incident(client, token, **overrides):
    payload = {
        "title": "Broken water pipe",
        "description": "Water gushing onto the road",
        "incident_type": "intervention",
    }
    payload.update(overrides)
    return client.post(
        "/api/v1/incidents",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def test_valid_incident_still_created(client):
    token = get_auth_token(client)
    res = create_incident(client, token)
    assert res.status_code == 201
    assert res.get_json()["data"]["incident"]["incident_type"] == "intervention"


def test_short_title_rejected(client):
    token = get_auth_token(client)
    res = create_incident(client, token, title="abc")
    assert res.status_code == 400
    assert "between 5 and 200" in res.get_json()["message"]


def test_long_title_rejected(client):
    token = get_auth_token(client)
    res = create_incident(client, token, title="x" * 201)
    assert res.status_code == 400


def test_short_description_rejected(client):
    token = get_auth_token(client)
    res = create_incident(client, token, description="no")
    assert res.status_code == 400
    assert "between 5 and 5000" in res.get_json()["message"]


def test_sos_type_rejected_on_incidents_endpoint(client):
    """SOS alerts must flow through /sos so they stay anonymous + throttled."""
    token = get_auth_token(client)
    res = create_incident(client, token, incident_type="sos")
    assert res.status_code == 400
    assert "/api/v1/sos" in res.get_json()["message"]


def upload(client, token, incident_id, data, filename):
    return client.post(
        f"/api/v1/incidents/{incident_id}/media",
        data={"file": (io.BytesIO(data), filename)},
        content_type="multipart/form-data",
        headers={"Authorization": f"Bearer {token}"},
    )


def make_incident_id(client, token):
    res = create_incident(client, token)
    return res.get_json()["data"]["incident"]["id"]


def test_oversize_image_rejected_and_file_removed(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    app.config["MAX_IMAGE_SIZE"] = 8  # shrink the limit so the test stays light
    token = get_auth_token(client)
    incident_id = make_incident_id(client, token)

    res = upload(client, token, incident_id, b"\x89PNG" + b"\x00" * 16, "big.png")
    assert res.status_code == 400
    assert "Images must be" in res.get_json()["message"]
    assert list(tmp_path.iterdir()) == []  # rejected file must not linger on disk


def test_oversize_video_rejected(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    app.config["MAX_VIDEO_SIZE"] = 8
    token = get_auth_token(client)
    incident_id = make_incident_id(client, token)

    res = upload(client, token, incident_id, b"\x00" * 16, "clip.mp4")
    assert res.status_code == 400
    assert "Videos must be" in res.get_json()["message"]
    assert list(tmp_path.iterdir()) == []


def test_small_image_still_uploads(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    app.config["MAX_IMAGE_SIZE"] = 1024
    token = get_auth_token(client)
    incident_id = make_incident_id(client, token)

    res = upload(client, token, incident_id, b"\x89PNG\r\n\x1a\n" + b"\x00" * 10, "ok.png")
    assert res.status_code == 201


def test_uploaded_file_can_be_served(client, app, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    token = get_auth_token(client)
    incident_id = make_incident_id(client, token)

    created = upload(client, token, incident_id, b"\x89PNG\r\n\x1a\n" + b"\x00" * 10, "ok.png")
    assert created.status_code == 201
    media_id = created.get_json()["data"]["media"]["id"]

    res = client.get(f"/api/v1/media/{media_id}/file")
    assert res.status_code == 200

# backend/tests/test_email_privacy.py
"""Privacy guards: reporter emails are admin-only, SOS always anonymous."""


def get_auth_token(client, email, username):
    client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": "pass12345",
              "confirm_password": "pass12345"},
    )
    res = client.post("/api/v1/auth/login", json={"email": email, "password": "pass12345"})
    return res.get_json()["data"]["access_token"]


def make_incident(client, token):
    res = client.post(
        "/api/v1/incidents",
        json={"title": "Broken water pipe", "description": "Water gushing onto the road",
              "incident_type": "intervention"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return res.get_json()["data"]["incident"]["id"]


def make_reporter_and_incident(client):
    token = get_auth_token(client, "reporter@ajali.dev", "thereporter")
    return make_incident(client, token)


def make_admin(client, app, email="adminview@ajali.dev"):
    from app.extensions import db as _db
    from app.models.user import User, UserRole

    client.post(
        "/api/v1/auth/register",
        json={"username": "adminview", "email": email, "password": "adminpass123",
              "confirm_password": "adminpass123"},
    )
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        user.role = UserRole.ADMIN
        _db.session.commit()
    res = client.post("/api/v1/admin/login", json={"email": email, "password": "adminpass123"})
    return res.get_json()["data"]["access_token"]


def test_public_feed_hides_reporter_emails(client, app):
    incident_id = make_reporter_and_incident(client)

    res = client.get("/api/v1/incidents")
    assert res.status_code == 200
    item = next(i for i in res.get_json()["data"]["incidents"] if i["id"] == incident_id)
    assert item["author"] == "thereporter"
    assert "author_email" not in item
    assert "reporter_email" not in item

    detail = client.get(f"/api/v1/incidents/{incident_id}")
    assert "author_email" not in detail.get_json()["data"]["incident"]


def test_citizen_token_also_hides_reporter_emails(client, app):
    incident_id = make_reporter_and_incident(client)
    stranger = get_auth_token(client, "stranger@ajali.dev", "stranger")

    res = client.get("/api/v1/incidents", headers={"Authorization": f"Bearer {stranger}"})
    item = next(i for i in res.get_json()["data"]["incidents"] if i["id"] == incident_id)
    assert "author_email" not in item


def test_admin_feed_includes_reporter_emails(client, app):
    incident_id = make_reporter_and_incident(client)
    admin_token = make_admin(client, app)

    res = client.get("/api/v1/incidents", headers={"Authorization": f"Bearer {admin_token}"})
    item = next(i for i in res.get_json()["data"]["incidents"] if i["id"] == incident_id)
    assert item["author_email"] == "reporter@ajali.dev"
    assert item["reporter_email"] == "reporter@ajali.dev"

    detail = client.get(
        f"/api/v1/incidents/{incident_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert detail.get_json()["data"]["incident"]["author_email"] == "reporter@ajali.dev"


def test_sos_stays_anonymous_even_for_admins(client, app):
    client.post("/api/v1/sos", json={"category": "crime", "latitude": -1.29, "longitude": 36.82})
    admin_token = make_admin(client, app)

    res = client.get("/api/v1/incidents", headers={"Authorization": f"Bearer {admin_token}"})
    sos = next(i for i in res.get_json()["data"]["incidents"] if i["incident_type"] == "sos")
    assert sos["author_id"] is None
    assert sos.get("author_email") is None

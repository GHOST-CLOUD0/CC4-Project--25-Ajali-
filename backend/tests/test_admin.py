from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.user import User, UserRole


def test_admin_login_endpoint(client, app):
    with app.app_context():
        admin = User(username="superadmin", email="superadmin@ajali.go.ke", role=UserRole.ADMIN)
        admin.set_password("admin-password123")
        citizen = User(username="citizen_jane", email="jane@example.com", role=UserRole.CITIZEN)
        citizen.set_password("citizen-password123")
        db.session.add_all([admin, citizen])
        db.session.commit()

    # Admin login succeeds on /api/v1/admin/login
    admin_res = client.post(
        "/api/v1/admin/login",
        json={"email": "superadmin@ajali.go.ke", "password": "admin-password123"},
    )
    assert admin_res.status_code == 200
    assert admin_res.get_json()["data"]["access_token"]
    assert admin_res.get_json()["data"]["user"]["role"] == "admin"

    # Regular citizen login is rejected on /api/v1/admin/login with 403 Forbidden
    citizen_res = client.post(
        "/api/v1/admin/login",
        json={"email": "jane@example.com", "password": "citizen-password123"},
    )
    assert citizen_res.status_code == 403
    assert "Administrator privileges required" in citizen_res.get_json()["message"]


def test_admin_can_change_incident_status(client, app):
    with app.app_context():
        reporter = User(username="reporter", email="reporter@example.com")
        reporter.set_password("secure-pass")
        admin = User(username="admin", email="admin@example.com", role=UserRole.ADMIN)
        admin.set_password("secure-pass")
        db.session.add_all([reporter, admin])
        db.session.commit()
        incident = Incident(
            title="Flooding",
            description="Floodwater on the road.",
            type="intervention",
            location="Mombasa",
            author_id=reporter.id,
        )
        db.session.add(incident)
        db.session.commit()
        incident_id = incident.id

    # Admin can change status
    login = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@example.com", "password": "secure-pass"},
    )
    admin_token = login.get_json()["data"]["access_token"]
    response = client.patch(
        f"/api/v1/admin/incidents/{incident_id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "under-investigation"},
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "under-investigation"

    # Regular citizen cannot change status via admin endpoint
    citizen_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reporter@example.com", "password": "secure-pass"},
    )
    citizen_token = citizen_login.get_json()["data"]["access_token"]
    forbidden_response = client.patch(
        f"/api/v1/admin/incidents/{incident_id}/status",
        headers={"Authorization": f"Bearer {citizen_token}"},
        json={"status": "resolved"},
    )
    assert forbidden_response.status_code == 403


def test_admin_can_view_stats(client, app):
    with app.app_context():
        admin = User(username="stats_admin", email="stats_admin@example.com", role=UserRole.ADMIN)
        admin.set_password("secure-pass")
        citizen = User(username="citizen_user", email="citizen@example.com")
        citizen.set_password("secure-pass")
        db.session.add_all([admin, citizen])
        db.session.commit()

        inc1 = Incident(
            title="Incident 1",
            description="Desc 1",
            type=IncidentType.RED_FLAG,
            location="Nairobi",
            status=IncidentStatus.DRAFT,
            author_id=citizen.id,
        )
        inc2 = Incident(
            title="Incident 2",
            description="Desc 2",
            type=IncidentType.INTERVENTION,
            location="Kisumu",
            status=IncidentStatus.RESOLVED,
            author_id=citizen.id,
        )
        db.session.add_all([inc1, inc2])
        db.session.commit()

    login = client.post(
        "/api/v1/admin/login",
        json={"email": "stats_admin@example.com", "password": "secure-pass"},
    )
    token = login.get_json()["data"]["access_token"]

    res = client.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    stats = res.get_json()["data"]
    assert stats["total"] == 2
    assert stats["draft"] == 1
    assert stats["resolved"] == 1

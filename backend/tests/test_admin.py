from app.extensions import db
from app.models.incident import Incident, IncidentStatus, IncidentType
from app.models.user import User, UserRole

def test_admin_login_and_citizen_blocked(client, app):
    with app.app_context():
        admin = User(username="admin_responder", email="admin@ajali.go.ke", role=UserRole.ADMIN)
        admin.set_password("adminpass123")
        citizen = User(username="citizen_user", email="citizen@example.com", role=UserRole.CITIZEN)
        citizen.set_password("citizenpass123")
        db.session.add_all([admin, citizen])
        db.session.commit()

    admin_login = client.post(
        "/api/v1/admin/login",
        json={"email": "admin@ajali.go.ke", "password": "adminpass123"},
    )
    assert admin_login.status_code == 200
    assert admin_login.get_json()["data"]["user"]["role"] == "admin"

    citizen_blocked = client.post(
        "/api/v1/admin/login",
        json={"email": "citizen@example.com", "password": "citizenpass123"},
    )
    assert citizen_blocked.status_code == 403

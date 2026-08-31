import pytest

def get_auth_token(client, username="reporter", email="reporter@example.com"):
    client.post(
        "/api/v1/auth/register",
        json={"username": username, "email": email, "password": "password123"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "password123"},
    )
    return res.get_json()["data"]["access_token"]

def test_create_incident_success(client):
    token = get_auth_token(client)
    res = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Road Collision Mombasa Road",
            "description": "Two vehicles blocked the left lane near Bellevue.",
            "incident_type": "red-flag",
            "location_name": "Nairobi, Mombasa Rd",
            "latitude": -1.3195,
            "longitude": 36.8522,
        },
    )
    assert res.status_code == 201
    incident = res.get_json()["data"]["incident"]
    assert incident["title"] == "Road Collision Mombasa Road"
    assert incident["status"] == "draft"

def test_create_incident_unauthenticated_fails(client):
    res = client.post(
        "/api/v1/incidents",
        json={"title": "Test Title", "description": "Short desc", "incident_type": "red-flag", "latitude": 0, "longitude": 0},
    )
    assert res.status_code == 401

def test_create_incident_invalid_coordinates(client):
    token = get_auth_token(client)
    res = client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Invalid GPS Incident",
            "description": "Description of the event here.",
            "incident_type": "intervention",
            "latitude": 95.0,
            "longitude": 36.8,
        },
    )
    assert res.status_code == 400

def test_list_and_filter_incidents(client):
    token = get_auth_token(client)
    client.post(
        "/api/v1/incidents",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Pothole Issue", "description": "Deep pothole.", "incident_type": "red-flag", "latitude": -1.2, "longitude": 36.8},
    )
    res = client.get("/api/v1/incidents?page=1&per_page=10")
    assert res.status_code == 200
    assert len(res.get_json()["data"]["incidents"]) >= 1

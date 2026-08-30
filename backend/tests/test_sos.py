"""Tests for the anonymous SOS panic-button endpoints."""

import pytest

from app.routes import sos as sos_module


@pytest.fixture(autouse=True)
def reset_sos_cooldown():
    sos_module._sos_last_seen.clear()
    yield
    sos_module._sos_last_seen.clear()


def test_sos_alert_created_without_login(client):
    response = client.post(
        "/api/v1/sos",
        json={
            "category": "accident",
            "description": "Matatu overturned, two people trapped",
            "latitude": -1.2921,
            "longitude": 36.8219,
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["status"] == "success"
    incident = body["data"]["incident"]
    assert incident["incident_type"] == "sos"
    assert incident["status"] == "under-investigation"
    assert incident["author_id"] is None
    assert incident["latitude"] == -1.2921
    assert incident["longitude"] == 36.8219
    assert "SOS - Road Accident" == incident["title"]


def test_sos_alert_without_location_or_description(client):
    response = client.post("/api/v1/sos", json={"category": "fire"})
    assert response.status_code == 201
    incident = response.get_json()["data"]["incident"]
    assert incident["latitude"] is None
    assert "immediate Fire assistance" in incident["description"]


def test_sos_rejects_invalid_category(client):
    response = client.post("/api/v1/sos", json={"category": "aliens"})
    assert response.status_code == 400
    assert response.get_json()["status"] == "error"


def test_sos_requires_coordinate_pair(client):
    response = client.post("/api/v1/sos", json={"category": "fire", "latitude": -1.29})
    assert response.status_code == 400


def test_sos_rate_limited(client):
    first = client.post("/api/v1/sos", json={"category": "crime"})
    assert first.status_code == 201
    second = client.post("/api/v1/sos", json={"category": "crime"})
    assert second.status_code == 429


def test_sos_emergency_numbers(client):
    response = client.get("/api/v1/sos/numbers")
    assert response.status_code == 200
    numbers = response.get_json()["data"]["numbers"]
    assert any(n["number"] == "112" for n in numbers)

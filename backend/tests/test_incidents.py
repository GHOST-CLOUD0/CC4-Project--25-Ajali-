def register_and_token(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "kamau", "email": "kamau@example.com", "password": "secure-pass"},
    )
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "kamau@example.com", "password": "secure-pass"},
    )
    return response.get_json()["data"]["access_token"]


def test_authenticated_user_can_create_and_list_incidents(client):
    token = register_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}
    created = client.post(
        "/api/v1/incidents",
        headers=headers,
        json={
            "title": "Road collision",
            "description": "Two vehicles collided.",
            "type": "red-flag",
            "location": "Nairobi",
            "latitude": -1.286389,
            "longitude": 36.817223,
        },
    )
    assert created.status_code == 201

    listing = client.get("/api/v1/incidents?page=1&per_page=10")
    body = listing.get_json()
    assert listing.status_code == 200
    assert body["pagination"]["total"] == 1

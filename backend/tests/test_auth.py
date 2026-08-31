import pytest
from app.models.user import User

def test_register_citizen_success(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"username": "amina_w", "email": "amina@example.com", "password": "secure-password123"},
    )
    assert res.status_code == 201
    data = res.get_json()["data"]
    assert data["username"] == "amina_w"
    assert data["email"] == "amina@example.com"
    assert data["role"] == "citizen"
    assert "password" not in data

def test_register_duplicate_fails(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "amina_dup", "email": "amina_dup@example.com", "password": "password123"},
    )
    res1 = client.post(
        "/api/v1/auth/register",
        json={"username": "other_user", "email": "amina_dup@example.com", "password": "password123"},
    )
    assert res1.status_code == 409

def test_register_invalid_inputs(client):
    res = client.post(
        "/api/v1/auth/register",
        json={"username": "testuser", "email": "test@example.com", "password": "short"},
    )
    assert res.status_code == 400

def test_login_success(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "john_doe", "email": "john@example.com", "password": "password123"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "john@example.com", "password": "password123"},
    )
    assert res.status_code == 200
    assert "access_token" in res.get_json()["data"]

def test_login_invalid_credentials(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "john_fail", "email": "fail@example.com", "password": "password123"},
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "fail@example.com", "password": "wrong_password"},
    )
    assert res.status_code == 401

def test_password_reset_flow(client):
    client.post(
        "/api/v1/auth/register",
        json={"username": "reset_user", "email": "reset@example.com", "password": "oldpassword123"},
    )
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"},
    )
    assert forgot_res.status_code == 200
    token = forgot_res.get_json()["data"]["reset_token"]
    assert token is not None

    reset_res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "password": "newpassword123"},
    )
    assert reset_res.status_code == 200

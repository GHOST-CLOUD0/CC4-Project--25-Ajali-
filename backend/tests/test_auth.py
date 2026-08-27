def test_user_can_register_and_log_in(client):
    registration = client.post(
        "/api/v1/auth/register",
        json={"username": "amina", "email": "amina@example.com", "password": "secure-pass"},
    )
    assert registration.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "amina@example.com", "password": "secure-pass"},
    )
    assert login.status_code == 200
    assert login.get_json()["data"]["access_token"]


def test_password_reset_flow(client):
    # 1. Register a user
    client.post(
        "/api/v1/auth/register",
        json={"username": "reset_user", "email": "reset@example.com", "password": "old-password123"},
    )

    # 2. Request forgot password
    forgot_res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "reset@example.com"},
    )
    assert forgot_res.status_code == 200
    reset_token = forgot_res.get_json()["data"]["reset_token"]
    assert reset_token is not None

    # 3. Reset password with invalid token fails
    bad_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid-token-value", "password": "brand-new-pass123"},
    )
    assert bad_reset.status_code == 400

    # 4. Reset password with valid token succeeds
    good_reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "password": "brand-new-pass123"},
    )
    assert good_reset.status_code == 200

    # 5. Old password no longer works
    failed_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "old-password123"},
    )
    assert failed_login.status_code == 401

    # 6. New password works successfully
    success_login = client.post(
        "/api/v1/auth/login",
        json={"email": "reset@example.com", "password": "brand-new-pass123"},
    )
    assert success_login.status_code == 200
    assert success_login.get_json()["data"]["access_token"]

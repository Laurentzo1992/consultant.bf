from tests.conftest import COMPANY, CONSULTANT


def test_register_consultant_and_me(client, register_user):
    headers = register_user()
    me = client.get("/auth/me", headers=headers).json()
    assert me["role"] == "consultant"
    assert me["company_name"] is None


def test_register_company_requires_company_name(client):
    payload = {**COMPANY, "company_name": ""}
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 422


def test_consultant_cannot_carry_company_fields(client):
    res = client.post("/auth/register", json={**CONSULTANT, "company_name": "Fake SA"})
    assert res.status_code == 201
    assert res.json()["company_name"] is None


def test_duplicate_email_refused(client, register_user):
    register_user()
    res = client.post("/auth/register", json=CONSULTANT)
    assert res.status_code == 400


def test_invalid_phone_refused(client):
    res = client.post("/auth/register", json={**CONSULTANT, "phone": "70102030"})
    assert res.status_code == 422


def test_wrong_password(client, register_user):
    register_user()
    res = client.post("/auth/login", data={"username": CONSULTANT["email"], "password": "nope-nope"})
    assert res.status_code == 401

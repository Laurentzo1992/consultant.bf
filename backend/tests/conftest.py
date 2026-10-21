import os

# Must be set before app.config.Settings() is instantiated (on first import
# of app.database / app.main below). Real OS env vars always take
# precedence over backend/.env, so this is safe even when a dev .env exists.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ADMIN_SESSION_SECRET", "test-admin-session-secret")
os.environ.setdefault("PAYMENT_PROVIDER", "mock")

import pytest
from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app

CONSULTANT = {
    "email": "awa@example.com",
    "password": "password123",
    "full_name": "Awa Ouedraogo",
    "phone": "+22670102030",
    "role": "consultant",
    "city": "Ouagadougou",
}

COMPANY = {
    "email": "rh@fasoagro.bf",
    "password": "password123",
    "full_name": "Paul Kafando",
    "phone": "+22671020304",
    "role": "entreprise",
    "city": "Ouagadougou",
    "company_name": "Faso Agro SA",
    "company_sector": "Agro-industrie",
    "company_size": "pme",
}

PROFILE = {
    "headline": "Expert-comptable et auditrice",
    "bio": "Douze ans d'audit financier pour des PME et des ONG.",
    "domain": "finance",
    "skills": "Audit financier, SYSCOHADA, Excel",
    "years_experience": 12,
    "daily_rate": 150000,
    "work_mode": "hybride",
    "city": "Ouagadougou",
}

MISSION = {
    "title": "Audit des comptes 2025",
    "description": "Audit complet des etats financiers de l'exercice 2025.",
    "domain": "finance",
    "required_skills": ["Audit financier", "SYSCOHADA"],
    "min_experience": 5,
    "duration": "6 semaines",
    "max_daily_rate": 160000,
    "work_mode": "sur_site",
    "city": "Ouagadougou",
}


@pytest.fixture(autouse=True)
def _fresh_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def register_user(client):
    """Registers a user and returns an {"Authorization": "Bearer ..."} header
    dict ready to use in subsequent requests. Defaults to a consultant;
    pass role="entreprise" (or use `register_company`) for a company."""

    def _register(**overrides):
        base = COMPANY if overrides.get("role") == "entreprise" else CONSULTANT
        payload = {**base, **overrides}
        res = client.post("/auth/register", json=payload)
        assert res.status_code == 201, res.text
        login = client.post(
            "/auth/login",
            data={"username": payload["email"], "password": payload["password"]},
        )
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    return _register


@pytest.fixture
def register_company(register_user):
    def _register(**overrides):
        return register_user(role="entreprise", **overrides)

    return _register


@pytest.fixture
def pay(client):
    """Pays (mock provider) for the given (type, reference_id)."""

    def _pay(headers, payment_type, reference_id):
        payment = client.post(
            "/payments/initiate",
            json={"type": payment_type, "reference_id": reference_id},
            headers=headers,
        )
        assert payment.status_code == 201, payment.text
        confirmed = client.post(f"/payments/{payment.json()['id']}/confirm", headers=headers)
        assert confirmed.status_code == 200, confirmed.text

    return _pay


@pytest.fixture
def publish_profile(client, pay):
    def _publish(headers, **overrides):
        res = client.put("/consultants/me", json={**PROFILE, **overrides}, headers=headers)
        assert res.status_code == 200, res.text
        pay(headers, "profile_publication", res.json()["id"])
        return client.get("/consultants/me", headers=headers).json()

    return _publish


@pytest.fixture
def publish_mission(client, pay):
    def _publish(headers, **overrides):
        res = client.post("/missions", json={**MISSION, **overrides}, headers=headers)
        assert res.status_code == 201, res.text
        pay(headers, "mission_publication", res.json()["id"])
        return client.get(f"/missions/{res.json()['id']}").json()

    return _publish

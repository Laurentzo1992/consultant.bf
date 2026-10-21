from app.models import ConnectionRequest, ConnectionStatus
from tests.conftest import PROFILE

PDF = b"%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n"

COMPLETE = {
    **PROFILE,
    "experiences": [
        {"title": "Auditrice senior", "organization": "Cabinet Kaizen", "start_year": 2015, "end_year": 2020},
        {"title": "Consultante independante", "start_year": 2020, "description": "Audits de PME et d'ONG"},
        {"title": "Assistante comptable", "organization": "Banque X", "start_year": 2012, "end_year": 2015},
    ],
    "diplomas": [{"title": "Master CCA", "institution": "Universite Joseph Ki-Zerbo", "year": 2012}],
    "certifications": [{"name": "Expert-comptable", "issuer": "ONECCA", "year": 2018}],
}


def _approve(db, request_id):
    cr = db.get(ConnectionRequest, request_id)
    cr.status = ConnectionStatus.approved
    db.commit()


def test_complete_profile_is_public_and_sorted(client, register_user, publish_profile):
    profile = publish_profile(register_user(), **COMPLETE)
    public = client.get(f"/consultants/{profile['id']}").json()

    # ongoing first, then most recent
    assert [e["title"] for e in public["experiences"]] == [
        "Consultante independante",
        "Auditrice senior",
        "Assistante comptable",
    ]
    assert public["diplomas"][0]["institution"] == "Universite Joseph Ki-Zerbo"
    assert public["certifications"][0]["name"] == "Expert-comptable"
    assert public["has_cv"] is False


def test_experience_years_are_validated(client, register_user):
    bad = {**PROFILE, "experiences": [{"title": "Poste", "start_year": 2020, "end_year": 2010}]}
    res = client.put("/consultants/me", json=bad, headers=register_user())
    assert res.status_code == 422


def test_keyword_search_covers_experiences_and_certifications(client, register_user, publish_profile):
    publish_profile(register_user(), **COMPLETE)
    assert client.get("/consultants", params={"q": "ONECCA"}).json()["total"] == 1
    assert client.get("/consultants", params={"q": "kaizen"}).json()["total"] == 1
    assert client.get("/consultants", params={"q": "Ki-Zerbo"}).json()["total"] == 1
    assert client.get("/consultants", params={"q": "introuvable"}).json()["total"] == 0


def test_cv_upload_rejects_non_pdf(client, register_user, publish_profile):
    headers = register_user()
    publish_profile(headers)
    res = client.put("/consultants/me/cv", files={"file": ("cv.pdf", b"hello", "application/pdf")}, headers=headers)
    assert res.status_code == 400


def test_cv_upload_size_limit(client, register_user, publish_profile, monkeypatch):
    from app.config import settings

    monkeypatch.setattr(settings, "cv_max_bytes", 100)
    headers = register_user()
    publish_profile(headers)
    big = PDF + b"x" * 200
    res = client.put("/consultants/me/cv", files={"file": ("cv.pdf", big, "application/pdf")}, headers=headers)
    assert res.status_code == 413


def test_cv_private_until_connection_approved(client, register_user, register_company, publish_profile, pay, db):
    consultant = register_user()
    profile = publish_profile(consultant)
    res = client.put("/consultants/me/cv", files={"file": ("cv.pdf", PDF, "application/pdf")}, headers=consultant)
    assert res.status_code == 200 and res.json()["has_cv"] is True

    # never in the public profile
    public = client.get(f"/consultants/{profile['id']}")
    assert public.json()["has_cv"] is True
    assert "cv_filename" not in public.text

    # the owner can download their own CV
    own = client.get("/consultants/me/cv", headers=consultant)
    assert own.status_code == 200 and own.content == PDF

    company = register_company()
    req = client.post("/connections", json={"profile_id": profile["id"]}, headers=company).json()
    assert req["consultant_has_cv"] is True
    pay(company, "connection_request", req["id"])
    assert client.get(f"/connections/{req['id']}/cv", headers=company).status_code == 403

    _approve(db, req["id"])
    cv = client.get(f"/connections/{req['id']}/cv", headers=company)
    assert cv.status_code == 200
    assert cv.content == PDF
    assert "CV-Awa-Ouedraogo.pdf" in cv.headers["content-disposition"]

    # the consultant side of the connection has no CV to download
    assert client.get(f"/connections/{req['id']}/cv", headers=consultant).status_code == 404
    # an unrelated company neither
    eve = register_company(email="eve@corp.bf", phone="+22671000098")
    assert client.get(f"/connections/{req['id']}/cv", headers=eve).status_code == 404


def test_replacing_and_deleting_cv(client, register_user, publish_profile):
    headers = register_user()
    publish_profile(headers)
    client.put("/consultants/me/cv", files={"file": ("a.pdf", PDF, "application/pdf")}, headers=headers)
    client.put("/consultants/me/cv", files={"file": ("b.pdf", PDF + b"v2", "application/pdf")}, headers=headers)
    assert client.get("/consultants/me/cv", headers=headers).content == PDF + b"v2"

    res = client.delete("/consultants/me/cv", headers=headers)
    assert res.json()["has_cv"] is False
    assert client.get("/consultants/me/cv", headers=headers).status_code == 404

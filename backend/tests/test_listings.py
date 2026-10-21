from tests.conftest import MISSION, PROFILE


def test_profile_hidden_until_paid(client, register_user, pay):
    headers = register_user()
    profile = client.put("/consultants/me", json=PROFILE, headers=headers).json()
    assert profile["status"] == "pending_payment"
    assert profile["skills"] == ["audit financier", "syscohada", "excel"]
    assert client.get(f"/consultants/{profile['id']}").status_code == 404
    assert client.get("/consultants").json()["total"] == 0

    pay(headers, "profile_publication", profile["id"])
    public = client.get(f"/consultants/{profile['id']}")
    assert public.status_code == 200
    assert client.get("/consultants").json()["total"] == 1


def test_public_profile_never_exposes_identity(client, register_user, publish_profile):
    headers = register_user()
    profile = publish_profile(headers)
    body = client.get(f"/consultants/{profile['id']}").text
    for secret in ("Awa", "Ouedraogo", "awa@example.com", "+22670102030"):
        assert secret not in body


def test_editing_published_profile_keeps_it_published(client, register_user, publish_profile):
    headers = register_user()
    publish_profile(headers)
    res = client.put("/consultants/me", json={**PROFILE, "headline": "Auditrice senior"}, headers=headers)
    assert res.json()["status"] == "published"
    assert res.json()["headline"] == "Auditrice senior"


def test_company_cannot_create_consultant_profile(client, register_company):
    headers = register_company()
    assert client.put("/consultants/me", json=PROFILE, headers=headers).status_code == 403


def test_consultant_cannot_create_mission(client, register_user):
    headers = register_user()
    assert client.post("/missions", json=MISSION, headers=headers).status_code == 403


def test_mission_published_after_payment_and_masks_company(client, register_company, pay):
    headers = register_company()
    mission = client.post("/missions", json=MISSION, headers=headers).json()
    assert mission["status"] == "pending_payment"
    assert client.get(f"/missions/{mission['id']}").status_code == 404

    pay(headers, "mission_publication", mission["id"])
    public = client.get(f"/missions/{mission['id']}")
    assert public.status_code == 200
    assert public.json()["company"]["sector"] == "Agro-industrie"
    assert "Faso Agro" not in public.text
    assert "Kafando" not in public.text


def test_search_filters(client, register_user, register_company, publish_profile, publish_mission):
    publish_profile(register_user())
    publish_profile(
        register_user(email="issa@example.com", phone="+22670000001"),
        headline="Developpeur React",
        domain="informatique",
        skills="React, Python",
    )
    assert client.get("/consultants", params={"domain": "informatique"}).json()["total"] == 1
    assert client.get("/consultants", params={"q": "react"}).json()["total"] == 1
    assert client.get("/consultants", params={"min_experience": 20}).json()["total"] == 0

    publish_mission(register_company())
    assert client.get("/missions", params={"work_mode": "sur_site"}).json()["total"] == 1
    assert client.get("/missions", params={"work_mode": "distance"}).json()["total"] == 0


def test_archive_and_reopen_mission(client, register_company, publish_mission):
    headers = register_company()
    mission = publish_mission(headers)
    res = client.post(f"/missions/{mission['id']}/visibility", params={"visible": False}, headers=headers)
    assert res.json()["status"] == "archived"
    assert client.get(f"/missions/{mission['id']}").status_code == 404
    res = client.post(f"/missions/{mission['id']}/visibility", params={"visible": True}, headers=headers)
    assert res.json()["status"] == "published"


def test_other_company_cannot_edit_mission(client, register_company, publish_mission):
    mission = publish_mission(register_company())
    other = register_company(email="other@corp.bf", phone="+22671000099")
    assert client.put(f"/missions/{mission['id']}", json=MISSION, headers=other).status_code == 404
    assert client.delete(f"/missions/{mission['id']}", headers=other).status_code == 404


def test_payment_options_expose_prices(client):
    body = client.get("/payments/options").json()
    assert body["prices"]["currency"] == "XOF"
    assert body["prices"]["mission_publication"] > 0

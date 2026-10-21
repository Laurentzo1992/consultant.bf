from app.models import ConnectionRequest, ConnectionStatus


def _approve(db, request_id):
    """Simulates an admin approving the request directly in the database."""
    cr = db.get(ConnectionRequest, request_id)
    cr.status = ConnectionStatus.approved
    db.commit()


def test_company_contacts_consultant_full_flow(client, register_user, register_company, publish_profile, pay, db):
    consultant = register_user()
    profile = publish_profile(consultant)
    company = register_company()

    req = client.post(
        "/connections", json={"profile_id": profile["id"], "message": "Mission d'audit"}, headers=company
    )
    assert req.status_code == 201, req.text
    req = req.json()
    assert req["initiated_by"] == "entreprise"
    assert req["consultant"]["full_name"] == "Identite masquee"

    # unpaid requests are not shown to the recipient yet
    assert client.get("/connections/received", headers=consultant).json() == []

    pay(company, "connection_request", req["id"])
    received = client.get("/connections/received", headers=consultant).json()[0]
    assert received["status"] == "pending_admin"
    assert received["company"]["company_name"] == "Identite masquee"
    assert received["company_sector"] == "Agro-industrie"

    assert client.get(f"/connections/{req['id']}/contact", headers=company).status_code == 403

    _approve(db, req["id"])

    as_company = client.get(f"/connections/{req['id']}/contact", headers=company).json()
    assert as_company["full_name"] == "Awa Ouedraogo"
    as_consultant = client.get(f"/connections/{req['id']}/contact", headers=consultant).json()
    assert as_consultant["company_name"] == "Faso Agro SA"
    assert as_consultant["phone"] == "+22671020304"


def test_consultant_applies_to_mission(client, register_user, register_company, publish_profile, publish_mission, pay):
    company = register_company()
    mission = publish_mission(company)
    consultant = register_user()

    # profile must be published before applying
    res = client.post("/connections", json={"mission_id": mission["id"]}, headers=consultant)
    assert res.status_code == 400

    publish_profile(consultant)
    res = client.post("/connections", json={"mission_id": mission["id"]}, headers=consultant)
    assert res.status_code == 201
    req = res.json()
    assert req["initiated_by"] == "consultant"
    assert req["mission"]["title"] == mission["title"]
    assert req["consultant_headline"] == "Expert-comptable et auditrice"

    # only the initiator pays
    payment = client.post(
        "/payments/initiate", json={"type": "connection_request", "reference_id": req["id"]}, headers=company
    )
    assert payment.status_code == 404

    pay(consultant, "connection_request", req["id"])
    assert client.get("/connections/received", headers=company).json()[0]["id"] == req["id"]
    assert client.get("/connections/mine", headers=consultant).json()[0]["status"] == "pending_admin"


def test_duplicate_request_refused(client, register_user, register_company, publish_profile):
    profile = publish_profile(register_user())
    company = register_company()
    assert client.post("/connections", json={"profile_id": profile["id"]}, headers=company).status_code == 201
    assert client.post("/connections", json={"profile_id": profile["id"]}, headers=company).status_code == 400


def test_company_can_only_attach_its_own_mission(
    client, register_user, register_company, publish_profile, publish_mission
):
    profile = publish_profile(register_user())
    other_mission = publish_mission(register_company(email="other@corp.bf", phone="+22671000099"))
    company = register_company()
    res = client.post(
        "/connections", json={"profile_id": profile["id"], "mission_id": other_mission["id"]}, headers=company
    )
    assert res.status_code == 404


def test_consultant_cannot_contact_consultant(client, register_user, publish_profile):
    profile = publish_profile(register_user())
    other = register_user(email="issa@example.com", phone="+22670000001")
    res = client.post("/connections", json={"profile_id": profile["id"]}, headers=other)
    assert res.status_code == 400


def test_unrelated_user_gets_404(client, register_user, register_company, publish_profile):
    profile = publish_profile(register_user())
    req = client.post("/connections", json={"profile_id": profile["id"]}, headers=register_company()).json()
    eve = register_company(email="eve@corp.bf", phone="+22671000098")
    assert client.get(f"/connections/{req['id']}", headers=eve).status_code == 404
    assert client.get(f"/connections/{req['id']}/contact", headers=eve).status_code == 404

from app.matching import score
from app.models import ConsultantProfile, Domain, Mission, WorkMode


def _profile(**kw):
    base = dict(
        domain=Domain.finance, skills="audit financier,syscohada,excel", years_experience=12,
        daily_rate=150000, work_mode=WorkMode.hybride, city="Ouagadougou",
    )
    return ConsultantProfile(**{**base, **kw})


def _mission(**kw):
    base = dict(
        domain=Domain.finance, required_skills="audit financier,syscohada", min_experience=5,
        max_daily_rate=160000, work_mode=WorkMode.sur_site, city="Ouagadougou",
    )
    return Mission(**{**base, **kw})


def test_perfect_match_scores_100():
    assert score(_profile(), _mission()) == 100


def test_partial_skill_match_by_containment():
    # "audit" in the mission matches "audit financier" in the profile
    assert score(_profile(), _mission(required_skills="audit,fiscalite")) < 100
    assert score(_profile(), _mission(required_skills="audit,fiscalite")) > score(
        _profile(), _mission(required_skills="marketing,fiscalite")
    )


def test_wrong_domain_and_too_expensive_scores_low():
    s = score(
        _profile(domain=Domain.marketing, skills="seo", daily_rate=400000, work_mode=WorkMode.distance, city="Bobo"),
        _mission(),
    )
    assert s < 30


def test_remote_mission_ignores_city():
    assert score(_profile(city="Bobo-Dioulasso"), _mission(work_mode=WorkMode.distance)) == 100


def test_mission_matches_endpoint_ranks_consultants(
    client, register_user, register_company, publish_profile, publish_mission
):
    publish_profile(register_user())
    publish_profile(
        register_user(email="issa@example.com", phone="+22670000001"),
        headline="Comptable junior",
        skills="Excel",
        years_experience=2,
    )
    publish_profile(
        register_user(email="salif@example.com", phone="+22670000002"),
        headline="Community manager",
        domain="marketing",
        skills="Reseaux sociaux",
    )
    company = register_company()
    mission = publish_mission(company)

    matches = client.get(f"/missions/{mission['id']}/matches", headers=company).json()
    assert [m["headline"] for m in matches] == ["Expert-comptable et auditrice", "Comptable junior"]
    assert matches[0]["score"] == 100
    assert matches[0]["score"] > matches[1]["score"]

    # only the mission owner can see its matches
    other = register_company(email="other@corp.bf", phone="+22671000099")
    assert client.get(f"/missions/{mission['id']}/matches", headers=other).status_code == 404


def test_consultant_recommended_missions(client, register_user, register_company, publish_profile, publish_mission):
    consultant = register_user()
    publish_profile(consultant)
    company = register_company()
    publish_mission(company)
    publish_mission(company, title="Campagne marketing", domain="marketing", required_skills="SEO")

    matches = client.get("/consultants/me/matches", headers=consultant).json()
    assert [m["title"] for m in matches] == ["Audit des comptes 2025"]
    assert matches[0]["score"] == 100

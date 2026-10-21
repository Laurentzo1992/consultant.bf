"""Consultant <-> mission matching.

A transparent, rule-based score from 0 to 100 (no black box: the same rules
are explained on the site) built from five criteria:

  - domain        35 pts  same field of expertise
  - skills        35 pts  share of the mission's required skills the
                          consultant has (a skill matches when one contains
                          the other, so "gestion de projet" matches
                          "gestion de projet agile")
  - experience    10 pts  full marks at or above the mission's minimum
  - location      10 pts  remote mission, or same city, or compatible modes
  - daily rate    10 pts  consultant's rate within the company's maximum

Candidates are first narrowed in SQL (published, and same domain or at
least one skill in common) and scored in Python.
"""

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models import ConsultantProfile, ListingStatus, Mission, WorkMode
from app.schemas import split_skills

WEIGHT_DOMAIN = 35
WEIGHT_SKILLS = 35
WEIGHT_EXPERIENCE = 10
WEIGHT_LOCATION = 10
WEIGHT_RATE = 10

MIN_SCORE = 30


def _skill_matches(wanted: str, have: list[str]) -> bool:
    return any(wanted == h or wanted in h or h in wanted for h in have)


def _location_points(profile: ConsultantProfile, mission: Mission) -> float:
    if mission.work_mode == WorkMode.distance:
        return WEIGHT_LOCATION
    same_city = bool(
        mission.city and profile.city and mission.city.strip().lower() == profile.city.strip().lower()
    )
    if same_city:
        return WEIGHT_LOCATION
    if mission.work_mode == WorkMode.hybride and profile.work_mode != WorkMode.sur_site:
        return WEIGHT_LOCATION * 0.6
    if mission.work_mode == WorkMode.sur_site and profile.work_mode == WorkMode.distance:
        return 0
    return WEIGHT_LOCATION * 0.3


def score(profile: ConsultantProfile, mission: Mission) -> int:
    points = 0.0

    if profile.domain == mission.domain:
        points += WEIGHT_DOMAIN

    required = split_skills(mission.required_skills)
    have = split_skills(profile.skills)
    if required:
        matched = sum(1 for skill in required if _skill_matches(skill, have))
        points += WEIGHT_SKILLS * matched / len(required)
    elif profile.domain == mission.domain:
        points += WEIGHT_SKILLS / 2  # nothing specific asked: neutral

    if mission.min_experience <= 0 or profile.years_experience >= mission.min_experience:
        points += WEIGHT_EXPERIENCE
    else:
        points += WEIGHT_EXPERIENCE * profile.years_experience / mission.min_experience

    points += _location_points(profile, mission)

    if not mission.max_daily_rate or not profile.daily_rate or profile.daily_rate <= mission.max_daily_rate:
        points += WEIGHT_RATE
    else:
        points += WEIGHT_RATE * mission.max_daily_rate / profile.daily_rate

    return round(min(points, 100))


def _skills_filter(column, skills: list[str]):
    return [column.ilike(f"%{skill}%") for skill in skills[:15]]


def consultants_for_mission(
    db: Session, mission: Mission, *, limit: int = 20, exclude_owner_id: int | None = None
) -> list[tuple[ConsultantProfile, int]]:
    criteria = [ConsultantProfile.domain == mission.domain]
    criteria += _skills_filter(ConsultantProfile.skills, split_skills(mission.required_skills))
    query = (
        db.query(ConsultantProfile)
        .options(joinedload(ConsultantProfile.owner))
        .filter(ConsultantProfile.status == ListingStatus.published, or_(*criteria))
    )
    if exclude_owner_id is not None:
        query = query.filter(ConsultantProfile.owner_id != exclude_owner_id)

    scored = [(p, score(p, mission)) for p in query.limit(500).all()]
    scored = [item for item in scored if item[1] >= MIN_SCORE]
    scored.sort(key=lambda item: (-item[1], -item[0].years_experience))
    return scored[:limit]


def missions_for_profile(
    db: Session, profile: ConsultantProfile, *, limit: int = 20
) -> list[tuple[Mission, int]]:
    criteria = [Mission.domain == profile.domain]
    criteria += _skills_filter(Mission.required_skills, split_skills(profile.skills))
    query = (
        db.query(Mission)
        .options(joinedload(Mission.owner))
        .filter(Mission.status == ListingStatus.published, Mission.owner_id != profile.owner_id, or_(*criteria))
    )

    scored = [(m, score(profile, m)) for m in query.limit(500).all()]
    scored = [item for item in scored if item[1] >= MIN_SCORE]
    scored.sort(key=lambda item: (-item[1], -item[0].created_at.timestamp() if item[0].created_at else 0))
    return scored[:limit]

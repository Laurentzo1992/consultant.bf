"""Database access helpers (queries only -- no HTTP concerns, no business
rules). Routers call these and hand the results to schemas for
serialization; business logic that has side effects beyond a single query
(payments, matching) stays in its own dedicated module instead."""

from sqlalchemy import String, cast, or_
from sqlalchemy.orm import Session, joinedload

from app.models import (
    ConnectionRequest,
    ConnectionStatus,
    ConsultantProfile,
    Domain,
    ListingStatus,
    Mission,
    User,
    WorkMode,
)

ACTIVE_CONNECTION_STATUSES = (
    ConnectionStatus.pending_payment,
    ConnectionStatus.pending_admin,
    ConnectionStatus.approved,
)


# ---------------------------------------------------------------------------
# Consultant profiles
# ---------------------------------------------------------------------------


def get_published_profiles_page(
    db: Session,
    *,
    offset: int,
    limit: int,
    q: str | None = None,
    domain: Domain | None = None,
    city: str | None = None,
    min_experience: int | None = None,
) -> tuple[list[ConsultantProfile], int]:
    """`q` searches headline, bio, skills, experiences, diplomas and
    certifications (case-insensitive substring)."""
    query = db.query(ConsultantProfile).filter(ConsultantProfile.status == ListingStatus.published)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            or_(
                ConsultantProfile.headline.ilike(pattern),
                ConsultantProfile.bio.ilike(pattern),
                ConsultantProfile.skills.ilike(pattern),
                cast(ConsultantProfile.experiences, String).ilike(pattern),
                cast(ConsultantProfile.diplomas, String).ilike(pattern),
                cast(ConsultantProfile.certifications, String).ilike(pattern),
            )
        )
    if domain:
        query = query.filter(ConsultantProfile.domain == domain)
    if city:
        query = query.filter(ConsultantProfile.city.ilike(f"%{city}%"))
    if min_experience:
        query = query.filter(ConsultantProfile.years_experience >= min_experience)

    query = query.order_by(ConsultantProfile.updated_at.desc(), ConsultantProfile.id.desc())
    total = query.count()
    return query.offset(offset).limit(limit).all(), total


def get_published_profile(db: Session, profile_id: int) -> ConsultantProfile | None:
    return (
        db.query(ConsultantProfile)
        .filter(ConsultantProfile.id == profile_id, ConsultantProfile.status == ListingStatus.published)
        .first()
    )


def get_profile_of(db: Session, owner_id: int) -> ConsultantProfile | None:
    return db.query(ConsultantProfile).filter(ConsultantProfile.owner_id == owner_id).first()


# ---------------------------------------------------------------------------
# Missions
# ---------------------------------------------------------------------------


def get_published_missions_page(
    db: Session,
    *,
    offset: int,
    limit: int,
    q: str | None = None,
    domain: Domain | None = None,
    city: str | None = None,
    work_mode: WorkMode | None = None,
) -> tuple[list[Mission], int]:
    query = (
        db.query(Mission)
        .options(joinedload(Mission.owner))
        .filter(Mission.status == ListingStatus.published)
    )

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            or_(
                Mission.title.ilike(pattern),
                Mission.description.ilike(pattern),
                Mission.required_skills.ilike(pattern),
            )
        )
    if domain:
        query = query.filter(Mission.domain == domain)
    if city:
        query = query.filter(Mission.city.ilike(f"%{city}%"))
    if work_mode:
        query = query.filter(Mission.work_mode == work_mode)

    query = query.order_by(Mission.created_at.desc(), Mission.id.desc())
    total = query.count()
    return query.offset(offset).limit(limit).all(), total


def get_published_mission(db: Session, mission_id: int) -> Mission | None:
    return (
        db.query(Mission)
        .options(joinedload(Mission.owner))
        .filter(Mission.id == mission_id, Mission.status == ListingStatus.published)
        .first()
    )


def get_owned_missions(db: Session, owner_id: int) -> list[Mission]:
    return (
        db.query(Mission)
        .options(joinedload(Mission.owner))
        .filter(Mission.owner_id == owner_id)
        .order_by(Mission.created_at.desc(), Mission.id.desc())
        .all()
    )


# ---------------------------------------------------------------------------
# Connection requests
# ---------------------------------------------------------------------------


def _connection_requests_query(db: Session):
    return db.query(ConnectionRequest).options(
        joinedload(ConnectionRequest.consultant).joinedload(User.profile),
        joinedload(ConnectionRequest.company),
        joinedload(ConnectionRequest.mission),
    )


def _party_filter(user_id: int):
    return or_(ConnectionRequest.consultant_id == user_id, ConnectionRequest.company_id == user_id)


def list_sent_connection_requests(db: Session, user: User) -> list[ConnectionRequest]:
    """Requests `user` initiated (as a company contacting a consultant, or as
    a consultant applying to a mission)."""
    return [r for r in _list_for_party(db, user.id) if r.requester_id == user.id]


def list_received_connection_requests(db: Session, user: User) -> list[ConnectionRequest]:
    return [r for r in _list_for_party(db, user.id) if r.requester_id != user.id]


def _list_for_party(db: Session, user_id: int) -> list[ConnectionRequest]:
    return (
        _connection_requests_query(db)
        .filter(_party_filter(user_id))
        .order_by(ConnectionRequest.created_at.desc(), ConnectionRequest.id.desc())
        .all()
    )


def get_connection_request_for_party(db: Session, request_id: int, user_id: int) -> ConnectionRequest | None:
    """Returns the request only if `user_id` is one of its two parties,
    otherwise None -- callers turn that into a 404 so as not to reveal
    whether a given id exists to unrelated users."""
    return _connection_requests_query(db).filter(ConnectionRequest.id == request_id, _party_filter(user_id)).first()


def has_active_connection_request(db: Session, *, consultant_id: int, company_id: int, mission_id: int | None) -> bool:
    query = db.query(ConnectionRequest).filter(
        ConnectionRequest.consultant_id == consultant_id,
        ConnectionRequest.company_id == company_id,
        ConnectionRequest.status.in_(ACTIVE_CONNECTION_STATUSES),
    )
    if mission_id is None:
        query = query.filter(ConnectionRequest.mission_id.is_(None))
    else:
        query = query.filter(ConnectionRequest.mission_id == mission_id)
    return query.first() is not None

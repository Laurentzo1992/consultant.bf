from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.deps import get_current_user
from app.models import (
    ConnectionInitiator,
    ConnectionRequest,
    ConnectionStatus,
    ListingStatus,
    Mission,
    User,
    UserRole,
)
from app.schemas import ConnectionRequestCreate, ConnectionRequestOut, ContactInfo

router = APIRouter(prefix="/connections", tags=["connections"])


def _get_request_for_party(db: Session, request_id: int, user: User) -> ConnectionRequest:
    req = crud.get_connection_request_for_party(db, request_id, user.id)
    if req is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Demande introuvable")
    return req


def _company_request(db: Session, payload: ConnectionRequestCreate, company: User) -> ConnectionRequest:
    """A company contacts a consultant, optionally about one of its missions."""
    if payload.profile_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choisissez le consultant a contacter")
    profile = crud.get_published_profile(db, payload.profile_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profil introuvable")

    if payload.mission_id is not None:
        mission = db.get(Mission, payload.mission_id)
        if mission is None or mission.owner_id != company.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission introuvable")
        if mission.status != ListingStatus.published:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cette mission n'est pas publiee")

    return ConnectionRequest(
        consultant_id=profile.owner_id,
        company_id=company.id,
        mission_id=payload.mission_id,
        initiated_by=ConnectionInitiator.entreprise,
        message=payload.message,
    )


def _consultant_application(db: Session, payload: ConnectionRequestCreate, consultant: User) -> ConnectionRequest:
    """A consultant applies to a mission. Their profile must be published,
    so the company can judge the application."""
    if payload.mission_id is None or payload.profile_id is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choisissez la mission a laquelle postuler")
    mission = crud.get_published_mission(db, payload.mission_id)
    if mission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission introuvable")
    profile = crud.get_profile_of(db, consultant.id)
    if profile is None or profile.status != ListingStatus.published:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Publiez d'abord votre profil pour postuler")

    return ConnectionRequest(
        consultant_id=consultant.id,
        company_id=mission.owner_id,
        mission_id=mission.id,
        initiated_by=ConnectionInitiator.consultant,
        message=payload.message,
    )


@router.post("", response_model=ConnectionRequestOut, status_code=status.HTTP_201_CREATED)
def create_connection_request(
    payload: ConnectionRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == UserRole.entreprise:
        req = _company_request(db, payload, current_user)
    else:
        req = _consultant_application(db, payload, current_user)

    if req.consultant_id == req.company_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas vous contacter vous-meme")
    if crud.has_active_connection_request(
        db, consultant_id=req.consultant_id, company_id=req.company_id, mission_id=req.mission_id
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Une demande est deja en cours")

    req.status = ConnectionStatus.pending_payment
    db.add(req)
    db.commit()
    db.refresh(req)
    return ConnectionRequestOut.from_model(_get_request_for_party(db, req.id, current_user))


@router.get("/mine", response_model=list[ConnectionRequestOut])
def list_my_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Requests I initiated (and pay for)."""
    return [ConnectionRequestOut.from_model(r) for r in crud.list_sent_connection_requests(db, current_user)]


@router.get("/received", response_model=list[ConnectionRequestOut])
def list_received_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Requests other members initiated towards me. Unpaid ones are hidden:
    they are not real requests yet."""
    return [
        ConnectionRequestOut.from_model(r)
        for r in crud.list_received_connection_requests(db, current_user)
        if r.status != ConnectionStatus.pending_payment
    ]


@router.get("/{request_id}", response_model=ConnectionRequestOut)
def get_request(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return ConnectionRequestOut.from_model(_get_request_for_party(db, request_id, current_user))


@router.get("/{request_id}/contact", response_model=ContactInfo)
def get_contact(request_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Reveals contact details ONLY once an admin has approved the request,
    and ONLY to the two parties involved."""
    req = _get_request_for_party(db, request_id, current_user)
    if req.status != ConnectionStatus.approved:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "La mise en relation n'a pas encore ete validee")

    other = req.company if current_user.id == req.consultant_id else req.consultant
    return ContactInfo(
        full_name=other.full_name,
        company_name=other.company_name,
        phone=other.phone,
        whatsapp=other.whatsapp,
        email=other.email,
    )

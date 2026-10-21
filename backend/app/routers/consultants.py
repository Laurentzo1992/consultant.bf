from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, matching
from app.database import get_db
from app.deps import get_current_consultant
from app.models import ConsultantProfile, Domain, ListingStatus, User
from app.schemas import MissionPublic, ProfileIn, ProfilePage, ProfilePublic

router = APIRouter(prefix="/consultants", tags=["consultants"])


@router.get("", response_model=ProfilePage)
def list_consultants(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    q: str | None = Query(None, description="Recherche dans le titre, la bio et les competences"),
    domain: Domain | None = Query(None),
    city: str | None = Query(None),
    min_experience: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
):
    """Public browsing, paginated: only published profiles, never with the
    consultant's name or contact info."""
    profiles, total = crud.get_published_profiles_page(
        db,
        offset=(page - 1) * page_size,
        limit=page_size,
        q=q,
        domain=domain,
        city=city,
        min_experience=min_experience,
    )
    return ProfilePage(
        items=[ProfilePublic.from_model(p) for p in profiles],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, ceil(total / page_size)),
    )


@router.get("/me", response_model=ProfilePublic)
def get_my_profile(current_user: User = Depends(get_current_consultant), db: Session = Depends(get_db)):
    profile = crud.get_profile_of(db, current_user.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vous n'avez pas encore de profil")
    return ProfilePublic.from_model(profile)


@router.put("/me", response_model=ProfilePublic)
def upsert_my_profile(
    payload: ProfileIn, current_user: User = Depends(get_current_consultant), db: Session = Depends(get_db)
):
    """Creates the profile in `pending_payment` state (visible once the
    publication fee is paid), or updates it -- an already published profile
    stays published, there is no fee to edit it."""
    profile = crud.get_profile_of(db, current_user.id)
    if profile is None:
        profile = ConsultantProfile(owner_id=current_user.id, status=ListingStatus.pending_payment)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return ProfilePublic.from_model(profile)


@router.post("/me/visibility", response_model=ProfilePublic)
def set_my_visibility(
    visible: bool, current_user: User = Depends(get_current_consultant), db: Session = Depends(get_db)
):
    """Hides (archives) or shows again an already paid profile."""
    profile = crud.get_profile_of(db, current_user.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vous n'avez pas encore de profil")
    if visible and profile.status == ListingStatus.archived:
        profile.status = ListingStatus.published
    elif not visible and profile.status == ListingStatus.published:
        profile.status = ListingStatus.archived
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ce profil ne peut pas changer de visibilite")
    db.commit()
    db.refresh(profile)
    return ProfilePublic.from_model(profile)


@router.get("/me/matches", response_model=list[MissionPublic])
def my_matching_missions(current_user: User = Depends(get_current_consultant), db: Session = Depends(get_db)):
    """Published missions ranked by how well they fit my profile."""
    profile = crud.get_profile_of(db, current_user.id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Creez d'abord votre profil")
    return [MissionPublic.from_model(m, score=s) for m, s in matching.missions_for_profile(db, profile)]


@router.get("/{profile_id}", response_model=ProfilePublic)
def get_consultant(profile_id: int, db: Session = Depends(get_db)):
    profile = crud.get_published_profile(db, profile_id)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profil introuvable")
    return ProfilePublic.from_model(profile)

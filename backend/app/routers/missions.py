from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import crud, matching
from app.database import get_db
from app.deps import get_current_company
from app.models import Domain, ListingStatus, Mission, User, WorkMode
from app.schemas import MissionIn, MissionPage, MissionPublic, ProfilePublic

router = APIRouter(prefix="/missions", tags=["missions"])


def _get_owned_mission(db: Session, mission_id: int, user: User) -> Mission:
    mission = db.get(Mission, mission_id)
    if mission is None or mission.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission introuvable")
    return mission


@router.get("", response_model=MissionPage)
def list_missions(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=48),
    q: str | None = Query(None, description="Recherche dans le titre, la description et les competences"),
    domain: Domain | None = Query(None),
    city: str | None = Query(None),
    work_mode: WorkMode | None = Query(None),
    db: Session = Depends(get_db),
):
    """Public browsing, paginated: only published missions, never with the
    company's name or contact info."""
    missions, total = crud.get_published_missions_page(
        db, offset=(page - 1) * page_size, limit=page_size, q=q, domain=domain, city=city, work_mode=work_mode
    )
    return MissionPage(
        items=[MissionPublic.from_model(m) for m in missions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, ceil(total / page_size)),
    )


@router.get("/mine", response_model=list[MissionPublic])
def list_my_missions(current_user: User = Depends(get_current_company), db: Session = Depends(get_db)):
    return [MissionPublic.from_model(m) for m in crud.get_owned_missions(db, current_user.id)]


@router.post("", response_model=MissionPublic, status_code=status.HTTP_201_CREATED)
def create_mission(
    payload: MissionIn, current_user: User = Depends(get_current_company), db: Session = Depends(get_db)
):
    """Creates the mission in `pending_payment` state. It only becomes
    publicly visible once the publication fee has been paid."""
    mission = Mission(owner_id=current_user.id, status=ListingStatus.pending_payment, **payload.model_dump())
    db.add(mission)
    db.commit()
    db.refresh(mission)
    return MissionPublic.from_model(mission)


@router.put("/{mission_id}", response_model=MissionPublic)
def update_mission(
    mission_id: int,
    payload: MissionIn,
    current_user: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    mission = _get_owned_mission(db, mission_id, current_user)
    for field, value in payload.model_dump().items():
        setattr(mission, field, value)
    db.commit()
    db.refresh(mission)
    return MissionPublic.from_model(mission)


@router.post("/{mission_id}/visibility", response_model=MissionPublic)
def set_mission_visibility(
    mission_id: int,
    visible: bool,
    current_user: User = Depends(get_current_company),
    db: Session = Depends(get_db),
):
    """Closes (archives) a published mission once filled, or reopens it."""
    mission = _get_owned_mission(db, mission_id, current_user)
    if visible and mission.status == ListingStatus.archived:
        mission.status = ListingStatus.published
    elif not visible and mission.status == ListingStatus.published:
        mission.status = ListingStatus.archived
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cette mission ne peut pas changer de visibilite")
    db.commit()
    db.refresh(mission)
    return MissionPublic.from_model(mission)


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_mission(mission_id: int, current_user: User = Depends(get_current_company), db: Session = Depends(get_db)):
    mission = _get_owned_mission(db, mission_id, current_user)
    db.delete(mission)
    db.commit()


@router.get("/{mission_id}/matches", response_model=list[ProfilePublic])
def mission_matches(mission_id: int, current_user: User = Depends(get_current_company), db: Session = Depends(get_db)):
    """Published consultant profiles ranked by fit with one of my missions."""
    mission = _get_owned_mission(db, mission_id, current_user)
    return [ProfilePublic.from_model(p, score=s) for p, s in matching.consultants_for_mission(db, mission)]


@router.get("/{mission_id}", response_model=MissionPublic)
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = crud.get_published_mission(db, mission_id)
    if mission is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mission introuvable")
    return MissionPublic.from_model(mission)

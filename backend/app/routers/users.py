from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import User, UserRole
from app.schemas import UserMe, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

COMPANY_FIELDS = {"company_name", "company_sector", "company_size"}


@router.get("/me", response_model=UserMe)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMe)
def update_me(payload: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in COMPANY_FIELDS and current_user.role != UserRole.entreprise:
            continue
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user

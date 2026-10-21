import re
from datetime import date, datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import (
    Availability,
    CompanySize,
    ConnectionInitiator,
    ConnectionStatus,
    Domain,
    ListingStatus,
    PaymentStatus,
    PaymentType,
    UserRole,
    WorkMode,
)

if TYPE_CHECKING:
    from app.models import ConnectionRequest, ConsultantProfile, Mission

# Shown instead of a party's real name (and a company's name) in a
# connection request until an admin approves it -- identity, like
# phone/email, stays protected until validated.
MASKED_NAME = "Identite masquee"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# E.164: a leading "+", then 8 to 15 digits, first digit 1-9. Matches what
# react-phone-number-input produces on the frontend (international format).
PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")


def _validate_phone(v: str) -> str:
    v = v.strip()
    if not PHONE_REGEX.match(v):
        raise ValueError("Numero de telephone invalide : utilisez le format international, ex. +22670000000")
    return v


def normalize_skills(value: str | list[str] | None) -> str:
    """Accepts "Excel, Power BI" or ["Excel", "Power BI"] and stores
    "excel,power bi": lowercase, trimmed, de-duplicated, order kept."""
    if value is None:
        return ""
    items = value if isinstance(value, list) else value.split(",")
    seen: dict[str, None] = {}
    for item in items:
        skill = " ".join(str(item).split()).lower()
        if skill:
            seen.setdefault(skill[:60], None)
    return ",".join(list(seen)[:30])


def split_skills(value: str) -> list[str]:
    return [s for s in value.split(",") if s] if value else []


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str = Field(min_length=2, max_length=255)
    phone: str
    whatsapp: bool = False
    role: UserRole
    city: str | None = None
    company_name: str | None = None
    company_sector: str | None = None
    company_size: CompanySize | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caracteres")
        return v

    @field_validator("phone")
    @classmethod
    def phone_e164(cls, v: str) -> str:
        return _validate_phone(v)

    @model_validator(mode="after")
    def company_requires_name(self) -> "UserCreate":
        if self.role == UserRole.entreprise:
            if not (self.company_name and self.company_name.strip()):
                raise ValueError("Le nom de l'entreprise est requis")
        else:
            self.company_name = self.company_sector = self.company_size = None
        return self


class UserMe(BaseModel):
    """Full profile, only ever returned to the user themselves."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    phone: str
    whatsapp: bool
    city: str | None
    company_name: str | None
    company_sector: str | None
    company_size: CompanySize | None
    is_admin: bool
    created_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    whatsapp: bool | None = None
    city: str | None = None
    company_name: str | None = None
    company_sector: str | None = None
    company_size: CompanySize | None = None

    @field_validator("phone")
    @classmethod
    def phone_e164(cls, v: str | None) -> str | None:
        return _validate_phone(v) if v is not None else v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Consultant profiles
# ---------------------------------------------------------------------------


class ProfileIn(BaseModel):
    headline: str = Field(min_length=3, max_length=255)
    bio: str = Field(min_length=20)
    domain: Domain
    skills: str | list[str] = ""
    years_experience: int = Field(0, ge=0, le=60)
    daily_rate: int | None = Field(None, ge=0)
    availability: Availability = Availability.immediate
    work_mode: WorkMode = WorkMode.hybride
    languages: str | None = None
    city: str | None = None

    @field_validator("skills", mode="after")
    @classmethod
    def _skills(cls, v: str | list[str]) -> str:
        return normalize_skills(v)


class ProfilePublic(BaseModel):
    """Public listing/detail view of a consultant. No name, no contact info:
    the person's identity is only revealed through an approved connection."""

    id: int
    owner_id: int
    headline: str
    bio: str
    domain: Domain
    skills: list[str]
    years_experience: int
    daily_rate: int | None
    availability: Availability
    work_mode: WorkMode
    languages: str | None
    city: str | None
    status: ListingStatus
    created_at: datetime
    # Matching score (0-100) when the listing is returned as a recommendation.
    score: int | None = None

    @classmethod
    def from_model(cls, p: "ConsultantProfile", *, score: int | None = None) -> "ProfilePublic":
        return cls(
            id=p.id,
            owner_id=p.owner_id,
            headline=p.headline,
            bio=p.bio,
            domain=p.domain,
            skills=split_skills(p.skills),
            years_experience=p.years_experience,
            daily_rate=p.daily_rate,
            availability=p.availability,
            work_mode=p.work_mode,
            languages=p.languages,
            city=p.city,
            status=p.status,
            created_at=p.created_at,
            score=score,
        )


class ProfilePage(BaseModel):
    items: list[ProfilePublic]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Missions
# ---------------------------------------------------------------------------


class MissionIn(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = Field(min_length=20)
    domain: Domain
    required_skills: str | list[str] = ""
    min_experience: int = Field(0, ge=0, le=60)
    duration: str | None = Field(None, max_length=100)
    max_daily_rate: int | None = Field(None, ge=0)
    work_mode: WorkMode = WorkMode.hybride
    city: str | None = None
    start_date: date | None = None

    @field_validator("required_skills", mode="after")
    @classmethod
    def _skills(cls, v: str | list[str]) -> str:
        return normalize_skills(v)


class MissionCompanyPublic(BaseModel):
    """What consultants may see about the company behind a mission: sector
    and size, never its name or contact details."""

    id: int
    sector: str | None
    size: CompanySize | None
    city: str | None


class MissionPublic(BaseModel):
    id: int
    title: str
    description: str
    domain: Domain
    required_skills: list[str]
    min_experience: int
    duration: str | None
    max_daily_rate: int | None
    work_mode: WorkMode
    city: str | None
    start_date: date | None
    status: ListingStatus
    created_at: datetime
    company: MissionCompanyPublic
    score: int | None = None

    @classmethod
    def from_model(cls, m: "Mission", *, score: int | None = None) -> "MissionPublic":
        return cls(
            id=m.id,
            title=m.title,
            description=m.description,
            domain=m.domain,
            required_skills=split_skills(m.required_skills),
            min_experience=m.min_experience,
            duration=m.duration,
            max_daily_rate=m.max_daily_rate,
            work_mode=m.work_mode,
            city=m.city,
            start_date=m.start_date,
            status=m.status,
            created_at=m.created_at,
            company=MissionCompanyPublic(
                id=m.owner.id, sector=m.owner.company_sector, size=m.owner.company_size, city=m.owner.city
            ),
            score=score,
        )


class MissionPage(BaseModel):
    items: list[MissionPublic]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Connection requests (mise en relation)
# ---------------------------------------------------------------------------


class ConnectionRequestCreate(BaseModel):
    """Either `profile_id` (a company contacting a consultant, optionally
    about one of its own missions) or `mission_id` alone (a consultant
    applying to a mission)."""

    profile_id: int | None = None
    mission_id: int | None = None
    message: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def _target(self) -> "ConnectionRequestCreate":
        if self.profile_id is None and self.mission_id is None:
            raise ValueError("Indiquez un profil consultant ou une mission")
        return self


class PartySummary(BaseModel):
    id: int
    full_name: str
    company_name: str | None = None
    city: str | None


class MissionSummary(BaseModel):
    id: int
    title: str


class ConnectionRequestOut(BaseModel):
    id: int
    initiated_by: ConnectionInitiator
    status: ConnectionStatus
    message: str | None
    created_at: datetime
    decided_at: datetime | None
    rejection_reason: str | None
    consultant: PartySummary
    consultant_headline: str | None
    company: PartySummary
    company_sector: str | None
    mission: MissionSummary | None

    @classmethod
    def from_model(cls, req: "ConnectionRequest") -> "ConnectionRequestOut":
        revealed = req.status == ConnectionStatus.approved
        consultant, company = req.consultant, req.company
        return cls(
            id=req.id,
            initiated_by=req.initiated_by,
            status=req.status,
            message=req.message,
            created_at=req.created_at,
            decided_at=req.decided_at,
            rejection_reason=req.rejection_reason,
            consultant=PartySummary(
                id=consultant.id,
                full_name=consultant.full_name if revealed else MASKED_NAME,
                city=consultant.city,
            ),
            consultant_headline=consultant.profile.headline if consultant.profile else None,
            company=PartySummary(
                id=company.id,
                full_name=company.full_name if revealed else MASKED_NAME,
                company_name=company.company_name if revealed else MASKED_NAME,
                city=company.city,
            ),
            company_sector=company.company_sector,
            mission=MissionSummary(id=req.mission.id, title=req.mission.title) if req.mission else None,
        )


class ContactInfo(BaseModel):
    """Only returned once a connection request has been approved by an admin."""

    full_name: str
    company_name: str | None
    phone: str
    whatsapp: bool
    email: EmailStr


# ---------------------------------------------------------------------------
# Payments
# ---------------------------------------------------------------------------


class PaymentInitiate(BaseModel):
    type: PaymentType
    reference_id: int
    # Which of the enabled providers to use; omitted = the default one.
    provider: Literal["mock", "ligdicash", "sebpay"] | None = None
    # Mobile Money details, only used (and then required) for "sebpay".
    # `phone` is the number to debit -- unrelated to the profile's private contact.
    phone: str | None = Field(default=None, pattern=r"^\+?[1-9]\d{7,14}$")
    country: str | None = Field(default=None, pattern=r"^[A-Za-z]{2}$")
    operator: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,50}$")
    otp_code: str | None = Field(default=None, pattern=r"^[A-Za-z0-9]{3,12}$")


class Prices(BaseModel):
    profile_publication: int
    mission_publication: int
    connection_request: int
    currency: str


class PaymentOptions(BaseModel):
    providers: list[str]
    default: str
    prices: Prices


class SebPayOperator(BaseModel):
    name: str
    code: str
    otp_required: bool
    ussd_code: str | None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: PaymentType
    reference_id: int
    amount: int
    currency: str
    status: PaymentStatus
    provider: str
    checkout_url: str | None
    created_at: datetime
    confirmed_at: datetime | None

import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class UserRole(str, enum.Enum):
    consultant = "consultant"
    entreprise = "entreprise"


class Domain(str, enum.Enum):
    """Fields of expertise, shared by consultant profiles and missions so
    that the matching can compare them directly (see app/matching.py)."""

    strategie = "strategie"
    finance = "finance"
    rh = "rh"
    informatique = "informatique"
    juridique = "juridique"
    marketing = "marketing"
    ingenierie = "ingenierie"
    sante = "sante"
    agriculture = "agriculture"
    environnement = "environnement"
    education = "education"
    logistique = "logistique"
    suivi_evaluation = "suivi_evaluation"
    autre = "autre"


class Availability(str, enum.Enum):
    immediate = "immediate"
    under_1_month = "under_1_month"
    over_1_month = "over_1_month"


class WorkMode(str, enum.Enum):
    sur_site = "sur_site"
    hybride = "hybride"
    distance = "distance"


class CompanySize(str, enum.Enum):
    tpe = "tpe"  # < 10
    pme = "pme"  # 10 - 249
    grande = "grande"  # 250+
    ong = "ong"
    public = "public"


class ListingStatus(str, enum.Enum):
    """Lifecycle of a consultant profile or a mission (same as the ads of the
    original dating site): visible publicly only once `published`."""

    draft = "draft"
    pending_payment = "pending_payment"
    published = "published"
    rejected = "rejected"
    archived = "archived"


class ConnectionStatus(str, enum.Enum):
    pending_payment = "pending_payment"
    pending_admin = "pending_admin"
    approved = "approved"
    rejected = "rejected"


class ConnectionInitiator(str, enum.Enum):
    """Who started the request: a company contacting a consultant, or a
    consultant applying to a mission."""

    entreprise = "entreprise"
    consultant = "consultant"


class PaymentType(str, enum.Enum):
    profile_publication = "profile_publication"
    mission_publication = "mission_publication"
    connection_request = "connection_request"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    success = "success"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)

    # Contact fields: PRIVATE. Never serialize these in public-facing schemas.
    # Only exposed via the dedicated /connections/{id}/contact endpoint once
    # a connection request has been approved by an admin.
    # Stored in E.164 format (e.g. "+22670000000"); see schemas.PHONE_REGEX.
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    whatsapp: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Company fields (role == entreprise only). The company name is masked
    # like the person's name until a connection is approved; sector and size
    # are public so consultants can judge a mission.
    company_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_sector: Mapped[str | None] = mapped_column(String(255), nullable=True)
    company_size: Mapped[CompanySize | None] = mapped_column(Enum(CompanySize), nullable=True)

    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    profile: Mapped["ConsultantProfile | None"] = relationship(
        back_populates="owner", cascade="all, delete-orphan", uselist=False
    )
    missions: Mapped[list["Mission"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    def __str__(self) -> str:
        return f"{self.full_name} <{self.email}>"


class ConsultantProfile(Base):
    __tablename__ = "consultant_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)

    headline: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[Domain] = mapped_column(Enum(Domain), nullable=False)
    # Comma-separated, normalised to lowercase (see schemas._normalize_skills).
    skills: Mapped[str] = mapped_column(Text, default="", nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    daily_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    availability: Mapped[Availability] = mapped_column(
        Enum(Availability), default=Availability.immediate, nullable=False
    )
    work_mode: Mapped[WorkMode] = mapped_column(Enum(WorkMode), default=WorkMode.hybride, nullable=False)
    languages: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)

    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus), default=ListingStatus.draft, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="profile")

    def __str__(self) -> str:
        return f"{self.headline} ({self.status.value})"


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[Domain] = mapped_column(Enum(Domain), nullable=False)
    required_skills: Mapped[str] = mapped_column(Text, default="", nullable=False)
    min_experience: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Maximum daily rate the company is ready to pay (TJM), in settings.currency.
    max_daily_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    work_mode: Mapped[WorkMode] = mapped_column(Enum(WorkMode), default=WorkMode.hybride, nullable=False)
    city: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    status: Mapped[ListingStatus] = mapped_column(
        Enum(ListingStatus), default=ListingStatus.draft, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="missions")
    connection_requests: Mapped[list["ConnectionRequest"]] = relationship(back_populates="mission")

    def __str__(self) -> str:
        return f"{self.title} ({self.status.value})"


class ConnectionRequest(Base):
    """A request to put one consultant and one company in touch, always
    through an admin. `mission_id` is set when a consultant applies to a
    mission, and optional when a company contacts a consultant directly."""

    __tablename__ = "connection_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    consultant_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    mission_id: Mapped[int | None] = mapped_column(ForeignKey("missions.id", ondelete="SET NULL"), nullable=True)
    initiated_by: Mapped[ConnectionInitiator] = mapped_column(Enum(ConnectionInitiator), nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[ConnectionStatus] = mapped_column(
        Enum(ConnectionStatus), default=ConnectionStatus.pending_payment, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    consultant: Mapped["User"] = relationship(foreign_keys=[consultant_id])
    company: Mapped["User"] = relationship(foreign_keys=[company_id])
    mission: Mapped["Mission | None"] = relationship(back_populates="connection_requests")
    decided_by: Mapped["User | None"] = relationship(foreign_keys=[decided_by_id])

    @property
    def requester_id(self) -> int:
        return self.company_id if self.initiated_by == ConnectionInitiator.entreprise else self.consultant_id

    def __str__(self) -> str:
        return f"Demande #{self.id} ({self.status.value})"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    type: Mapped[PaymentType] = mapped_column(Enum(PaymentType), nullable=False)
    reference_id: Mapped[int] = mapped_column(Integer, nullable=False)

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending, nullable=False)

    provider: Mapped[str] = mapped_column(String(50), default="mock", nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # LigdiCash invoice token from checkout-invoice/create. Used to re-verify
    # the transaction status server-to-server instead of trusting the
    # callback payload (see app/ligdicash.py).
    provider_token: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    checkout_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="payments")

    def __str__(self) -> str:
        return f"Paiement #{self.id} - {self.amount} {self.currency} ({self.status.value})"

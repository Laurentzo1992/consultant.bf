"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-10-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import ENUM as PGEnum

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: these enum types are created/dropped explicitly below via
# .create()/.drop() so that reusing the same type across two tables (e.g.
# "domain" on both consultant_profiles and missions) doesn't try to CREATE
# TYPE twice. Must use the postgresql-specific ENUM (not the generic sa.Enum)
# for create_type to actually be honored when emitted in CREATE TABLE.
user_role_enum = PGEnum("consultant", "entreprise", name="userrole", create_type=False)
company_size_enum = PGEnum("tpe", "pme", "grande", "ong", "public", name="companysize", create_type=False)
domain_enum = PGEnum(
    "strategie", "finance", "rh", "informatique", "juridique", "marketing", "ingenierie", "sante",
    "agriculture", "environnement", "education", "logistique", "suivi_evaluation", "autre",
    name="domain", create_type=False,
)
availability_enum = PGEnum("immediate", "under_1_month", "over_1_month", name="availability", create_type=False)
work_mode_enum = PGEnum("sur_site", "hybride", "distance", name="workmode", create_type=False)
listing_status_enum = PGEnum(
    "draft", "pending_payment", "published", "rejected", "archived", name="listingstatus", create_type=False
)
connection_status_enum = PGEnum(
    "pending_payment", "pending_admin", "approved", "rejected", name="connectionstatus", create_type=False
)
connection_initiator_enum = PGEnum("entreprise", "consultant", name="connectioninitiator", create_type=False)
payment_type_enum = PGEnum(
    "profile_publication", "mission_publication", "connection_request", name="paymenttype", create_type=False
)
payment_status_enum = PGEnum("pending", "success", "failed", name="paymentstatus", create_type=False)

ALL_ENUMS = (
    user_role_enum,
    company_size_enum,
    domain_enum,
    availability_enum,
    work_mode_enum,
    listing_status_enum,
    connection_status_enum,
    connection_initiator_enum,
    payment_type_enum,
    payment_status_enum,
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum in ALL_ENUMS:
        enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("whatsapp", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("city", sa.String(255), nullable=True),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("company_sector", sa.String(255), nullable=True),
        sa.Column("company_size", company_size_enum, nullable=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "consultant_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("headline", sa.String(255), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False),
        sa.Column("domain", domain_enum, nullable=False),
        sa.Column("skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("years_experience", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("daily_rate", sa.Integer(), nullable=True),
        sa.Column("availability", availability_enum, nullable=False, server_default="immediate"),
        sa.Column("work_mode", work_mode_enum, nullable=False, server_default="hybride"),
        sa.Column("languages", sa.String(255), nullable=True),
        sa.Column("city", sa.String(255), nullable=True),
        sa.Column("status", listing_status_enum, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_consultant_profiles_status", "consultant_profiles", ["status"])

    op.create_table(
        "missions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("domain", domain_enum, nullable=False),
        sa.Column("required_skills", sa.Text(), nullable=False, server_default=""),
        sa.Column("min_experience", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duration", sa.String(100), nullable=True),
        sa.Column("max_daily_rate", sa.Integer(), nullable=True),
        sa.Column("work_mode", work_mode_enum, nullable=False, server_default="hybride"),
        sa.Column("city", sa.String(255), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("status", listing_status_enum, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_missions_status", "missions", ["status"])
    op.create_index("ix_missions_owner_id", "missions", ["owner_id"])

    op.create_table(
        "connection_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consultant_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("mission_id", sa.Integer(), sa.ForeignKey("missions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("initiated_by", connection_initiator_enum, nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("status", connection_status_enum, nullable=False, server_default="pending_payment"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decided_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_connection_requests_consultant_id", "connection_requests", ["consultant_id"])
    op.create_index("ix_connection_requests_company_id", "connection_requests", ["company_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", payment_type_enum, nullable=False),
        sa.Column("reference_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(10), nullable=False),
        sa.Column("status", payment_status_enum, nullable=False, server_default="pending"),
        sa.Column("provider", sa.String(50), nullable=False, server_default="mock"),
        sa.Column("provider_reference", sa.String(255), nullable=True),
        sa.Column("provider_token", sa.String(1000), nullable=True),
        sa.Column("checkout_url", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("connection_requests")
    op.drop_table("missions")
    op.drop_table("consultant_profiles")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for enum in reversed(ALL_ENUMS):
        enum.drop(bind, checkfirst=True)

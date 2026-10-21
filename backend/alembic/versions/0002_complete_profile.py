"""complete consultant profile: experiences, diplomas, certifications, CV

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LIST_COLUMNS = ("experiences", "diplomas", "certifications")


def upgrade() -> None:
    for name in LIST_COLUMNS:
        op.add_column(
            "consultant_profiles",
            sa.Column(name, sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        )
    op.add_column("consultant_profiles", sa.Column("cv_filename", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("consultant_profiles", "cv_filename")
    for name in reversed(LIST_COLUMNS):
        op.drop_column("consultant_profiles", name)

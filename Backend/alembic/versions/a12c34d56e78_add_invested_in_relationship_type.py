"""add invested in relationship type

Revision ID: a12c34d56e78
Revises: d69b18fa7180
Create Date: 2026-05-16 20:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "a12c34d56e78"
down_revision: Union[str, Sequence[str], None] = "d69b18fa7180"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO relationship_types (code, name, description)
        SELECT 'INVESTED_IN', 'Invested In', 'Investor has invested in a company.'
        WHERE NOT EXISTS (
            SELECT 1 FROM relationship_types WHERE code = 'INVESTED_IN'
        )
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM relationship_types WHERE code = 'INVESTED_IN'")

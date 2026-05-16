"""add invested in relationship type

Revision ID: 8c2d4e5f6a70
Revises: d69b18fa7180
Create Date: 2026-05-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "8c2d4e5f6a70"
down_revision: Union[str, Sequence[str], None] = "d69b18fa7180"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO relationship_types (code, name, description)
        SELECT 'INVESTED_IN', 'Invested In', 'Completed investment from an investor into a company or startup.'
        WHERE NOT EXISTS (SELECT 1 FROM relationship_types WHERE code = 'INVESTED_IN')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM relationship_types WHERE code = 'INVESTED_IN'")

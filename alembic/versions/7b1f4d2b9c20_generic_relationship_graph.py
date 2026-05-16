"""generic relationship graph

Revision ID: 7b1f4d2b9c20
Revises: fc62e9c218a7
Create Date: 2026-05-16 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7b1f4d2b9c20"
down_revision: Union[str, Sequence[str], None] = "fc62e9c218a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "relationship_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )

    with op.batch_alter_table("entities") as batch_op:
        batch_op.add_column(sa.Column("name", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("country", sa.String(), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("verified_status", sa.String(), nullable=True, server_default="UNVERIFIED"))
        batch_op.add_column(sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True))

    with op.batch_alter_table("expertise_tags") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(), nullable=False)

    with op.batch_alter_table("entity_expertise") as batch_op:
        batch_op.add_column(sa.Column("weight", sa.Float(), nullable=True, server_default="1.0"))

    with op.batch_alter_table("relationships") as batch_op:
        batch_op.alter_column("mentor_id", new_column_name="source_entity_id", existing_type=sa.Integer(), nullable=False)
        batch_op.alter_column("company_id", new_column_name="target_entity_id", existing_type=sa.Integer(), nullable=False)
        batch_op.add_column(sa.Column("relationship_type_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("strength_score", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("industry_similarity", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("expertise_alignment", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("stage_match", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("geo_match", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("mentor_success_score", sa.Float(), nullable=True, server_default="0.0"))
        batch_op.add_column(sa.Column("ai_reasoning_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True))
        batch_op.add_column(sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.create_foreign_key("fk_relationships_relationship_type_id", "relationship_types", ["relationship_type_id"], ["id"])

    op.execute("UPDATE relationships SET status = 'PROPOSED' WHERE status IS NULL OR status = 'PENDING'")

    op.create_table(
        "milestones",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("relationship_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.ForeignKeyConstraint(["relationship_id"], ["relationships.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    with op.batch_alter_table("feedback") as batch_op:
        batch_op.alter_column("relationship_id", existing_type=sa.Integer(), nullable=False)
        batch_op.add_column(sa.Column("from_entity_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("text_feedback", sa.Text(), nullable=True))
        batch_op.create_foreign_key("fk_feedback_from_entity_id", "entities", ["from_entity_id"], ["id"])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("feedback") as batch_op:
        batch_op.drop_constraint("fk_feedback_from_entity_id", type_="foreignkey")
        batch_op.drop_column("text_feedback")
        batch_op.drop_column("from_entity_id")
        batch_op.alter_column("relationship_id", existing_type=sa.Integer(), nullable=True)

    op.drop_table("milestones")

    with op.batch_alter_table("relationships") as batch_op:
        batch_op.drop_constraint("fk_relationships_relationship_type_id", type_="foreignkey")
        batch_op.drop_column("completed_at")
        batch_op.drop_column("activated_at")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("ai_reasoning_summary")
        batch_op.drop_column("mentor_success_score")
        batch_op.drop_column("geo_match")
        batch_op.drop_column("stage_match")
        batch_op.drop_column("expertise_alignment")
        batch_op.drop_column("industry_similarity")
        batch_op.drop_column("strength_score")
        batch_op.drop_column("relationship_type_id")
        batch_op.alter_column("target_entity_id", new_column_name="company_id", existing_type=sa.Integer(), nullable=True)
        batch_op.alter_column("source_entity_id", new_column_name="mentor_id", existing_type=sa.Integer(), nullable=True)

    with op.batch_alter_table("entity_expertise") as batch_op:
        batch_op.drop_column("weight")

    with op.batch_alter_table("expertise_tags") as batch_op:
        batch_op.alter_column("name", existing_type=sa.String(), nullable=True)

    with op.batch_alter_table("entities") as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("created_at")
        batch_op.drop_column("verified_status")
        batch_op.drop_column("description")
        batch_op.drop_column("country")
        batch_op.drop_column("name")

    op.drop_table("relationship_types")

"""Remove WebhookEndpoint.user_id

Revision ID: 1c41b2824616
Revises: 16b19486b490
Create Date: 2025-02-03 11:10:12.714269

"""

import sqlalchemy as sa
from alembic import op

# Polar Custom Imports

# revision identifiers, used by Alembic.
revision = "1c41b2824616"
down_revision = "16b19486b490"
branch_labels: tuple[str] | None = None
depends_on: tuple[str] | None = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.execute(
        """DELETE FROM webhook_endpoints WHERE user_id IS NOT NULL OR organization_id IS NULL"""
    )

    op.alter_column(
        "webhook_endpoints", "organization_id", existing_type=sa.UUID(), nullable=False
    )
    op.drop_index("ix_webhook_endpoints_user_id", table_name="webhook_endpoints")
    op.drop_constraint(
        "webhook_endpoints_user_id_fkey", "webhook_endpoints", type_="foreignkey"
    )
    op.drop_column("webhook_endpoints", "user_id")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "webhook_endpoints",
        sa.Column("user_id", sa.UUID(), autoincrement=False, nullable=True),
    )
    op.create_foreign_key(
        "webhook_endpoints_user_id_fkey",
        "webhook_endpoints",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_webhook_endpoints_user_id", "webhook_endpoints", ["user_id"], unique=False
    )
    op.alter_column(
        "webhook_endpoints", "organization_id", existing_type=sa.UUID(), nullable=True
    )
    # ### end Alembic commands ###

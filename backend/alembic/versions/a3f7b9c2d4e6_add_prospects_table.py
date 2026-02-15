"""Add prospects table

Revision ID: a3f7b9c2d4e6
Revises: 21cb625ca578
Create Date: 2026-02-15 16:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7b9c2d4e6'
down_revision: Union[str, Sequence[str], None] = '21cb625ca578'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create prospects table for Google Maps business data."""
    op.create_table('prospects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('website', sa.String(), nullable=True),
        sa.Column('has_website', sa.Boolean(), nullable=True),
        sa.Column('rating', sa.Float(), nullable=True),
        sa.Column('review_count', sa.Integer(), nullable=True),
        sa.Column('maps_url', sa.String(), nullable=True),
        sa.Column('match_score', sa.Float(), nullable=True),
        sa.Column('match_reason', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('source_keyword', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_prospects_id'), 'prospects', ['id'], unique=False)
    op.create_index(op.f('ix_prospects_name'), 'prospects', ['name'], unique=False)
    op.create_index(op.f('ix_prospects_category'), 'prospects', ['category'], unique=False)
    op.create_index(op.f('ix_prospects_maps_url'), 'prospects', ['maps_url'], unique=True)
    op.create_index(op.f('ix_prospects_status'), 'prospects', ['status'], unique=False)
    op.create_index(op.f('ix_prospects_created_at'), 'prospects', ['created_at'], unique=False)


def downgrade() -> None:
    """Drop prospects table."""
    op.drop_index(op.f('ix_prospects_created_at'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_status'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_maps_url'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_category'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_name'), table_name='prospects')
    op.drop_index(op.f('ix_prospects_id'), table_name='prospects')
    op.drop_table('prospects')

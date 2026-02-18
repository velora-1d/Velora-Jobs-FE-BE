"""add campaign fields: target_type, smart_ai, sent_count, failed_count

Revision ID: e1f2a3b4c5d6
Revises: d9e8f7a6b5c4
Create Date: 2026-02-18 10:46:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1f2a3b4c5d6'
down_revision = 'd9e8f7a6b5c4'
branch_labels = None
depends_on = None


def upgrade():
    # Add missing columns to campaigns table
    op.add_column('campaigns', sa.Column('target_type', sa.String(), nullable=True, server_default='leads'))
    op.add_column('campaigns', sa.Column('template_id', sa.Integer(), nullable=True))
    op.add_column('campaigns', sa.Column('smart_ai', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('campaigns', sa.Column('sent_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('campaigns', sa.Column('failed_count', sa.Integer(), nullable=True, server_default='0'))

    # Create index for target_type
    op.create_index(op.f('ix_campaigns_target_type'), 'campaigns', ['target_type'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_campaigns_target_type'), table_name='campaigns')
    op.drop_column('campaigns', 'failed_count')
    op.drop_column('campaigns', 'sent_count')
    op.drop_column('campaigns', 'smart_ai')
    op.drop_column('campaigns', 'template_id')
    op.drop_column('campaigns', 'target_type')

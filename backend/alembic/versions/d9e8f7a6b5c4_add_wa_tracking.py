"""add wa tracking

Revision ID: d9e8f7a6b5c4
Revises: c7d9e3f4a5b6
Create Date: 2026-02-18 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd9e8f7a6b5c4'
down_revision = 'c7d9e3f4a5b6'
branch_labels = None
depends_on = None


def upgrade():
    # Add wa_contacted_at to leads and prospects
    op.add_column('leads', sa.Column('wa_contacted_at', sa.DateTime(), nullable=True))
    op.add_column('prospects', sa.Column('wa_contacted_at', sa.DateTime(), nullable=True))
    
    # Update follow_ups
    op.alter_column('follow_ups', 'lead_id', existing_type=sa.Integer(), nullable=True)
    op.add_column('follow_ups', sa.Column('prospect_id', sa.Integer(), sa.ForeignKey('prospects.id'), nullable=True))
    
    # Create index for performance
    op.create_index(op.f('ix_follow_ups_prospect_id'), 'follow_ups', ['prospect_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_follow_ups_prospect_id'), table_name='follow_ups')
    op.drop_column('follow_ups', 'prospect_id')
    # Use batch_alter_table for safe column alteration if needed, but standard alter should work for nullable=False 
    # NOTE: Reverting nullable=True to False might fail if nulls were introduced. 
    # We will assume it's safe or user handles data cleanup.
    op.alter_column('follow_ups', 'lead_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('prospects', 'wa_contacted_at')
    op.drop_column('leads', 'wa_contacted_at')

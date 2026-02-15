"""Add activity_logs table

Revision ID: c7d9e3f4a5b6
Revises: b5c8d2e6f1a3
Create Date: 2026-02-15

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'c7d9e3f4a5b6'
down_revision = 'b5c8d2e6f1a3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'activity_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('level', sa.String(), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_activity_logs_category'), 'activity_logs', ['category'], unique=False)
    op.create_index(op.f('ix_activity_logs_created_at'), 'activity_logs', ['created_at'], unique=False)
    op.create_index(op.f('ix_activity_logs_id'), 'activity_logs', ['id'], unique=False)
    op.create_index(op.f('ix_activity_logs_level'), 'activity_logs', ['level'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_activity_logs_level'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_id'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_created_at'), table_name='activity_logs')
    op.drop_index(op.f('ix_activity_logs_category'), table_name='activity_logs')
    op.drop_table('activity_logs')

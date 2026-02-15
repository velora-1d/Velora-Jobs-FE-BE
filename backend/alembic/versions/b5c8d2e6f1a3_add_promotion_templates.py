"""Add promotion_templates table and expand campaigns

Revision ID: b5c8d2e6f1a3
Revises: a3f7b9c2d4e6
Create Date: 2026-02-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'b5c8d2e6f1a3'
down_revision = 'a3f7b9c2d4e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create promotion_templates table
    op.create_table(
        'promotion_templates',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('category', sa.String(), server_default='general'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('variables', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_promotion_templates_id', 'promotion_templates', ['id'])

    # Add new columns to campaigns table
    with op.batch_alter_table('campaigns') as batch_op:
        batch_op.add_column(sa.Column('target_type', sa.String(), server_default='leads'))
        batch_op.add_column(sa.Column('template_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('sent_count', sa.Integer(), server_default='0'))
        batch_op.add_column(sa.Column('failed_count', sa.Integer(), server_default='0'))


def downgrade() -> None:
    with op.batch_alter_table('campaigns') as batch_op:
        batch_op.drop_column('failed_count')
        batch_op.drop_column('sent_count')
        batch_op.drop_column('template_id')
        batch_op.drop_column('target_type')

    op.drop_index('ix_promotion_templates_id')
    op.drop_table('promotion_templates')

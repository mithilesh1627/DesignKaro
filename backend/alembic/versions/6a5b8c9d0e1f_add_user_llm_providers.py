"""add user_llm_providers table

Revision ID: 6a5b8c9d0e1f
Revises: 4f40378c57d8
Create Date: 2026-09-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6a5b8c9d0e1f'
down_revision: Union[str, None] = '4f40378c57d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'user_llm_providers',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', sa.Uuid(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False),
        sa.Column('model', sa.String(length=128), nullable=False),
        sa.Column('encrypted_api_key', sa.Text(), nullable=True),
        sa.Column('base_url', sa.String(length=512), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('settings_metadata', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'provider', name='uq_user_provider')
    )
    op.create_index('ix_user_llm_providers_user_id', 'user_llm_providers', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_user_llm_providers_user_id', table_name='user_llm_providers')
    op.drop_table('user_llm_providers')

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.user import User


class Design(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "designs"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    public_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    scale_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="designs")
    versions: Mapped[list["DesignVersion"]] = relationship(
        "DesignVersion",
        back_populates="design",
        cascade="all, delete-orphan",
        order_by="DesignVersion.version_number",
    )


class DesignVersion(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "design_versions"

    design_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    graph_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    design: Mapped["Design"] = relationship("Design", back_populates="versions")
    nodes: Mapped[list["DesignNode"]] = relationship(
        "DesignNode", back_populates="version", cascade="all, delete-orphan"
    )
    edges: Mapped[list["DesignEdge"]] = relationship(
        "DesignEdge", back_populates="version", cascade="all, delete-orphan"
    )
    evaluations: Mapped[list["DesignEvaluation"]] = relationship(
        "DesignEvaluation", back_populates="version", cascade="all, delete-orphan"
    )


class DesignNode(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "design_nodes"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("design_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    node_id_str: Mapped[str] = mapped_column(String(64), nullable=False)
    node_type: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    x_pos: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    y_pos: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    version: Mapped["DesignVersion"] = relationship("DesignVersion", back_populates="nodes")


class DesignEdge(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "design_edges"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("design_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    edge_id_str: Mapped[str] = mapped_column(String(64), nullable=False)
    source_node: Mapped[str] = mapped_column(String(64), nullable=False)
    target_node: Mapped[str] = mapped_column(String(64), nullable=False)
    edge_type: Mapped[str] = mapped_column(String(64), default="default", nullable=False)
    properties: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    version: Mapped["DesignVersion"] = relationship("DesignVersion", back_populates="edges")


class DesignEvaluation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "design_evaluations"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("design_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    overall_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rule_violations: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    recommendations: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)

    # Relationships
    version: Mapped["DesignVersion"] = relationship("DesignVersion", back_populates="evaluations")

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from backend.app.models.design import Design


class Simulation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "simulations"

    design_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    qps_target: Mapped[int] = mapped_column(Integer, default=1000, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending", nullable=False)

    # Relationships
    design: Mapped["Design"] = relationship("Design")
    events: Mapped[list["SimulationEvent"]] = relationship(
        "SimulationEvent", back_populates="simulation", cascade="all, delete-orphan"
    )


class SimulationEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "simulation_events"

    simulation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("simulations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)  # traffic_tick, failure_injected, recovery
    metrics: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    failure_details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    # Relationships
    simulation: Mapped["Simulation"] = relationship("Simulation", back_populates="events")

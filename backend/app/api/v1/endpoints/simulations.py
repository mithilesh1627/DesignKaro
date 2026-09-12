from backend.app.schemas.design import GraphData
from backend.app.schemas.simulation import (
    FailureConfig,
    SimulationResponse,
    TrafficProfile,
)
from backend.app.services.simulation_engine import traffic_simulator
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class RunSimulationPayload(BaseModel):
    graph_data: GraphData
    traffic: TrafficProfile = TrafficProfile()
    failure: FailureConfig = FailureConfig()


@router.post("/run", response_model=SimulationResponse)
async def run_traffic_simulation(
    payload: RunSimulationPayload,
) -> SimulationResponse:
    """Run discrete-event traffic simulation and chaos failure injection across architecture graph."""
    return traffic_simulator.run_simulation(
        graph=payload.graph_data,
        traffic=payload.traffic,
        failure=payload.failure,
    )

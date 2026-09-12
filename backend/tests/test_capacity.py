import pytest
from backend.app.schemas.capacity import CapacityInput
from backend.app.services.capacity_engine import capacity_calculator


def test_capacity_calculator_mathematical_derivation():
    inp = CapacityInput(
        dau=10000000,  # 10M DAU
        actions_per_user_day=20,
        read_write_ratio=10.0,
        peak_multiplier=2.5,
        avg_write_payload_kb=2.0,
        avg_read_payload_kb=10.0,
        storage_duration_years=5,
        replication_factor=3,
        cache_hot_ratio=0.20,
        server_qps_capacity=2500,
    )

    res = capacity_calculator.calculate(inp)

    # 10M DAU * 20 actions = 200,000,000 requests / 86,400s ≈ 2314.8 QPS
    assert round(res.avg_total_qps) == 2315
    # Peak = 2314.8 * 2.5 ≈ 5787 QPS
    assert round(res.peak_total_qps) == 5787

    # Read/Write split: 10:1 ratio means 1/11 write, 10/11 read
    assert res.peak_write_qps < res.peak_read_qps
    assert round(res.peak_write_qps + res.peak_read_qps) == round(res.peak_total_qps)

    # Bandwidth calculations
    assert res.ingress_bandwidth_mb_per_sec > 0
    assert res.egress_bandwidth_mb_per_sec > res.ingress_bandwidth_mb_per_sec

    # Storage calculations
    assert res.daily_storage_replicated_gb > res.daily_storage_raw_gb
    assert res.storage_5_years_tb > res.storage_1_year_tb

    # Derivations and markdown report
    assert len(res.derivation_steps) == 6
    assert "System Design Capacity Estimation Report" in res.markdown_report


@pytest.mark.asyncio
async def test_capacity_api_endpoint(client):
    payload = {
        "dau": 5000000,
        "actions_per_user_day": 10,
        "read_write_ratio": 50.0,
        "peak_multiplier": 2.0,
        "avg_write_payload_kb": 1.0,
        "avg_read_payload_kb": 5.0,
        "storage_duration_years": 3,
        "replication_factor": 3,
        "cache_hot_ratio": 0.20,
        "server_qps_capacity": 2000,
    }
    response = await client.post("/api/v1/capacity/calculate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "avg_total_qps" in data
    assert "peak_total_qps" in data
    assert "derivation_steps" in data
    assert len(data["derivation_steps"]) == 6

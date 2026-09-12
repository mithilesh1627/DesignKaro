import math

from backend.app.schemas.capacity import CapacityInput, CapacityResponse, DerivationStep


class CapacityCalculator:
    """
    Mathematical distributed systems capacity estimation engine.
    Calculates QPS, peak multipliers, bandwidth, storage horizons, and cache sizing with first-principles derivation steps.
    """

    SECONDS_PER_DAY = 86400
    DAYS_PER_YEAR = 365

    def calculate(self, inp: CapacityInput) -> CapacityResponse:
        steps: list[DerivationStep] = []

        # 1. Total Operations & Average QPS
        total_daily_ops = inp.dau * inp.actions_per_user_day
        avg_total_qps = total_daily_ops / self.SECONDS_PER_DAY
        peak_total_qps = avg_total_qps * inp.peak_multiplier

        steps.append(
            DerivationStep(
                step_number=1,
                metric_name="Average & Peak Total QPS",
                formula="QPS_avg = (DAU * Actions_per_Day) / 86,400 ; QPS_peak = QPS_avg * Peak_Multiplier",
                calculation=f"({inp.dau:,} * {inp.actions_per_user_day}) / 86,400 = {avg_total_qps:.2f} QPS ; Peak = {avg_total_qps:.2f} * {inp.peak_multiplier} = {peak_total_qps:.2f} QPS",
                result_str=f"Avg: {round(avg_total_qps):,} QPS | Peak: {round(peak_total_qps):,} QPS",
                notes="Traffic is distributed over a 24-hour cycle. Peak multiplier accounts for diurnal spikes during active hours.",
            )
        )

        # 2. Read vs Write Split
        # Read ratio R:1 -> Fraction of writes = 1 / (R + 1); Fraction of reads = R / (R + 1)
        write_fraction = 1.0 / (inp.read_write_ratio + 1.0)
        read_fraction = inp.read_write_ratio / (inp.read_write_ratio + 1.0)

        avg_write_qps = avg_total_qps * write_fraction
        peak_write_qps = peak_total_qps * write_fraction
        avg_read_qps = avg_total_qps * read_fraction
        peak_read_qps = peak_total_qps * read_fraction

        steps.append(
            DerivationStep(
                step_number=2,
                metric_name="Read & Write QPS Split",
                formula="QPS_write = QPS_total * (1 / (Ratio + 1)) ; QPS_read = QPS_total * (Ratio / (Ratio + 1))",
                calculation=f"Writes ({write_fraction*100:.1f}%): Avg {avg_write_qps:.1f} / Peak {peak_write_qps:.1f} ; Reads ({read_fraction*100:.1f}%): Avg {avg_read_qps:.1f} / Peak {peak_read_qps:.1f}",
                result_str=f"Peak Write: {round(peak_write_qps):,} QPS | Peak Read: {round(peak_read_qps):,} QPS",
                notes="Dictates database choice: Heavy writes favor LSM-tree storage (Cassandra/ScyllaDB/RocksDB); heavy reads favor B-Tree with Redis cache-aside.",
            )
        )

        # 3. Bandwidth (Ingress & Egress)
        # Ingress is driven by writes: peak_write_qps * avg_write_payload_kb (in KB/s)
        ingress_kb_per_sec = peak_write_qps * inp.avg_write_payload_kb
        ingress_mb_per_sec = ingress_kb_per_sec / 1024.0
        ingress_gbps = (ingress_mb_per_sec * 8.0) / 1024.0

        # Egress is driven by reads: peak_read_qps * avg_read_payload_kb (in KB/s)
        egress_kb_per_sec = peak_read_qps * inp.avg_read_payload_kb
        egress_mb_per_sec = egress_kb_per_sec / 1024.0
        egress_gbps = (egress_mb_per_sec * 8.0) / 1024.0

        steps.append(
            DerivationStep(
                step_number=3,
                metric_name="Network Bandwidth (Ingress & Egress)",
                formula="Bandwidth (MB/s) = (Peak_QPS * Avg_Payload_KB) / 1,024 ; Gbps = (MB/s * 8) / 1,024",
                calculation=f"Ingress: ({peak_write_qps:.1f} * {inp.avg_write_payload_kb} KB) / 1,024 = {ingress_mb_per_sec:.2f} MB/s ({ingress_gbps:.3f} Gbps) ; Egress: ({peak_read_qps:.1f} * {inp.avg_read_payload_kb} KB) / 1,024 = {egress_mb_per_sec:.2f} MB/s ({egress_gbps:.3f} Gbps)",
                result_str=f"Ingress: {ingress_mb_per_sec:.2f} MB/s ({ingress_gbps:.3f} Gbps) | Egress: {egress_mb_per_sec:.2f} MB/s ({egress_gbps:.3f} Gbps)",
                notes="Determines network NIC card requirements (1GbE vs 10GbE vs 40GbE) and cloud NAT gateway egress egress costs.",
            )
        )

        # 4. Storage Horizons
        # Daily writes in GB = (total daily writes * write_payload_kb) / (1024 * 1024)
        daily_writes = total_daily_ops * write_fraction
        daily_storage_raw_gb = (daily_writes * inp.avg_write_payload_kb) / (1024.0 * 1024.0)
        daily_storage_replicated_gb = daily_storage_raw_gb * inp.replication_factor

        storage_1_year_tb = (daily_storage_replicated_gb * self.DAYS_PER_YEAR) / 1024.0
        storage_3_years_tb = storage_1_year_tb * 3.0
        storage_5_years_tb = storage_1_year_tb * 5.0
        total_retention_storage_tb = storage_1_year_tb * inp.storage_duration_years

        steps.append(
            DerivationStep(
                step_number=4,
                metric_name="Multi-Year Storage Horizons",
                formula="Daily_GB = (Daily_Writes * Payload_KB) / (1,024^2) ; Total_TB = (Daily_GB * Replication * 365 * Years) / 1,024",
                calculation=f"Raw Daily: {daily_storage_raw_gb:.2f} GB/day ; Replicated ({inp.replication_factor}x): {daily_storage_replicated_gb:.2f} GB/day ; 1 Year: {storage_1_year_tb:.2f} TB ; {inp.storage_duration_years} Years: {total_retention_storage_tb:.2f} TB",
                result_str=f"Daily: {daily_storage_replicated_gb:.1f} GB | 1 Year: {storage_1_year_tb:.1f} TB | {inp.storage_duration_years} Years: {total_retention_storage_tb:.1f} TB",
                notes="Includes replication factor. Hot data stored on NVMe SSD; older historical data (>90 days) should be tiered to S3/cold storage.",
            )
        )

        # 5. Cache Sizing (Pareto 80/20 Rule)
        # We cache cache_hot_ratio (default 20%) of daily read volume in RAM
        daily_reads = total_daily_ops * read_fraction
        daily_read_data_gb = (daily_reads * inp.avg_read_payload_kb) / (1024.0 * 1024.0)
        recommended_cache_ram_gb = daily_read_data_gb * inp.cache_hot_ratio
        # Assume Redis nodes with 32 GB RAM each, 75% max memory target -> ~24GB usable
        recommended_cache_nodes = max(1, math.ceil(recommended_cache_ram_gb / 24.0))

        steps.append(
            DerivationStep(
                step_number=5,
                metric_name="Cache Sizing (Pareto 80/20)",
                formula="Cache_RAM_GB = Daily_Read_Volume_GB * Hot_Ratio",
                calculation=f"{daily_read_data_gb:.2f} GB * {inp.cache_hot_ratio*100:.0f}% = {recommended_cache_ram_gb:.2f} GB RAM",
                result_str=f"{recommended_cache_ram_gb:.1f} GB RAM (~{recommended_cache_nodes} nodes of 32GB Redis)",
                notes="Caching the 20% most active keys serves ~80% of read traffic, protecting primary databases from read saturation.",
            )
        )

        # 6. Compute & App Server Sizing
        min_app_servers_peak = max(1, math.ceil(peak_total_qps / inp.server_qps_capacity))
        min_app_servers_ha = max(2, math.ceil(min_app_servers_peak * 1.5))  # 50% headroom for failover/N+1

        steps.append(
            DerivationStep(
                step_number=6,
                metric_name="Compute & Cluster Sizing",
                formula="Servers_peak = ceil(Peak_QPS / Server_Capacity) ; Servers_HA = ceil(Servers_peak * 1.5)",
                calculation=f"ceil({peak_total_qps:.1f} / {inp.server_qps_capacity}) = {min_app_servers_peak} nodes ; With 50% N+1 Headroom = {min_app_servers_ha} nodes",
                result_str=f"Peak: {min_app_servers_peak} instances | HA Recommended: {min_app_servers_ha} instances",
                notes="Ensure cluster is spread across multiple Availability Zones (multi-AZ) with autoscaling policies.",
            )
        )

        # Markdown Report Generation
        report = f"""# System Design Capacity Estimation Report

### 1. Traffic Profile
- **DAU**: {inp.dau:,}
- **Average QPS**: {avg_total_qps:,.1f} QPS
- **Peak QPS ({inp.peak_multiplier}x multiplier)**: {peak_total_qps:,.1f} QPS
- **Peak Write QPS**: {peak_write_qps:,.1f} QPS ({write_fraction*100:.1f}%)
- **Peak Read QPS**: {peak_read_qps:,.1f} QPS ({read_fraction*100:.1f}%)

### 2. Network & Bandwidth
- **Ingress Bandwidth**: {ingress_mb_per_sec:.2f} MB/s ({ingress_gbps:.3f} Gbps)
- **Egress Bandwidth**: {egress_mb_per_sec:.2f} MB/s ({egress_gbps:.3f} Gbps)

### 3. Storage Forecast (Replication Factor = {inp.replication_factor})
- **Daily Replicated Storage**: {daily_storage_replicated_gb:.2f} GB / day
- **1-Year Storage**: {storage_1_year_tb:.2f} TB
- **3-Year Storage**: {storage_3_years_tb:.2f} TB
- **{inp.storage_duration_years}-Year Total Retention**: {total_retention_storage_tb:.2f} TB

### 4. Cache & Compute Sizing
- **Recommended Redis Cache RAM**: {recommended_cache_ram_gb:.2f} GB (~{recommended_cache_nodes} nodes of 32GB)
- **App Service Fleet**: {min_app_servers_ha} instances (handles peak load with 50% multi-AZ headroom)
"""

        return CapacityResponse(
            avg_total_qps=avg_total_qps,
            peak_total_qps=peak_total_qps,
            avg_write_qps=avg_write_qps,
            peak_write_qps=peak_write_qps,
            avg_read_qps=avg_read_qps,
            peak_read_qps=peak_read_qps,
            ingress_bandwidth_mb_per_sec=ingress_mb_per_sec,
            ingress_bandwidth_gbps=ingress_gbps,
            egress_bandwidth_mb_per_sec=egress_mb_per_sec,
            egress_bandwidth_gbps=egress_gbps,
            daily_storage_raw_gb=daily_storage_raw_gb,
            daily_storage_replicated_gb=daily_storage_replicated_gb,
            storage_1_year_tb=storage_1_year_tb,
            storage_3_years_tb=storage_3_years_tb,
            storage_5_years_tb=storage_5_years_tb,
            total_retention_storage_tb=total_retention_storage_tb,
            recommended_cache_ram_gb=recommended_cache_ram_gb,
            recommended_cache_nodes=recommended_cache_nodes,
            min_app_servers_peak=min_app_servers_peak,
            min_app_servers_ha=min_app_servers_ha,
            derivation_steps=steps,
            markdown_report=report,
        )


capacity_calculator = CapacityCalculator()

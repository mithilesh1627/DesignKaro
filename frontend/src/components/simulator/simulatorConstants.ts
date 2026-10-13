import React from "react";
import {
  Globe,
  Layers,
  ShieldCheck,
  Server,
  Cpu,
  Activity,
  Database,
  Zap,
  Radio,
  HardDrive,
} from "lucide-react";
import type {
  ArchitectureComponentCategory,
  ArchitectureNodeConfig,
  ArchitectureGraph,
} from "@/types/simulator";

export type SimulatorTab = "architecture" | "requirements" | "guide" | "simulation" | "evaluation";

// ============================================================================
// COMPONENT LIBRARY DEFINITIONS
// ============================================================================

export interface ComponentDefinition {
  type: string;
  name: string;
  category: ArchitectureComponentCategory;
  description: string;
  icon: React.ElementType;
  badge: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  defaultConfig: ArchitectureNodeConfig;
}

export const COMPONENT_CATALOG: ComponentDefinition[] = [
  // NETWORKING
  {
    type: "client",
    name: "Client",
    category: "networking",
    description: "Web browsers, mobile devices, or API callers.",
    icon: Globe,
    badge: "Ingress",
    borderClass: "border-sky-500/40",
    textClass: "text-sky-400",
    bgClass: "bg-sky-500/10",
    defaultConfig: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
  },
  {
    type: "dns",
    name: "DNS",
    category: "networking",
    description: "Domain Name System with GeoDNS / Anycast routing.",
    icon: Globe,
    badge: "Routing",
    borderClass: "border-blue-500/40",
    textClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 100000, latency_ms: 2 },
  },
  {
    type: "cdn",
    name: "CDN",
    category: "networking",
    description: "Edge caching network for static media and assets.",
    icon: Globe,
    badge: "Edge",
    borderClass: "border-teal-500/40",
    textClass: "text-teal-400",
    bgClass: "bg-teal-500/10",
    defaultConfig: { replicas: 5, qps_capacity: 50000, latency_ms: 5, cache_policy: "LRU" },
  },
  {
    type: "load_balancer",
    name: "Load Balancer",
    category: "networking",
    description: "L4/L7 Traffic Distributor (NGINX / AWS ALB).",
    icon: Layers,
    badge: "Proxy",
    borderClass: "border-cyan-500/40",
    textClass: "text-cyan-400",
    bgClass: "bg-cyan-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
  },
  {
    type: "api_gateway",
    name: "API Gateway",
    category: "networking",
    description: "Auth, TLS termination, routing, and rate limiting.",
    icon: ShieldCheck,
    badge: "Gateway",
    borderClass: "border-purple-500/40",
    textClass: "text-purple-400",
    bgClass: "bg-purple-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 25000, latency_ms: 3, rate_limit_rps: 10000 },
  },

  // COMPUTE
  {
    type: "server",
    name: "Server",
    category: "compute",
    description: "Monolithic or general stateless application server.",
    icon: Server,
    badge: "App",
    borderClass: "border-indigo-500/40",
    textClass: "text-indigo-400",
    bgClass: "bg-indigo-500/10",
    defaultConfig: { replicas: 4, qps_capacity: 8000, latency_ms: 12, memory_gb: 16 },
  },
  {
    type: "microservice",
    name: "Microservice",
    category: "compute",
    description: "Domain-isolated containerized backend service.",
    icon: Cpu,
    badge: "Service",
    borderClass: "border-violet-500/40",
    textClass: "text-violet-400",
    bgClass: "bg-violet-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 10000, latency_ms: 8, memory_gb: 8 },
  },
  {
    type: "worker",
    name: "Worker",
    category: "compute",
    description: "Background async queue consumer and batch worker.",
    icon: Activity,
    badge: "Async",
    borderClass: "border-emerald-500/40",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 4000, latency_ms: 25, memory_gb: 8 },
  },

  // DATABASE
  {
    type: "postgresql",
    name: "PostgreSQL",
    category: "database",
    description: "Relational ACID database with primary-replica HA.",
    icon: Database,
    badge: "RDBMS",
    borderClass: "border-blue-400/40",
    textClass: "text-blue-300",
    bgClass: "bg-blue-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 5000,
      latency_ms: 14,
      storage_gb: 500,
      replication_mode: "sync",
    },
  },
  {
    type: "mysql",
    name: "MySQL",
    category: "database",
    description: "High-throughput InnoDB relational database.",
    icon: Database,
    badge: "RDBMS",
    borderClass: "border-amber-500/40",
    textClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 5500,
      latency_ms: 12,
      storage_gb: 500,
      replication_mode: "semi_sync",
    },
  },
  {
    type: "mongodb",
    name: "MongoDB",
    category: "database",
    description: "Document store for dynamic schemas & fast writes.",
    icon: Database,
    badge: "NoSQL",
    borderClass: "border-emerald-400/40",
    textClass: "text-emerald-300",
    bgClass: "bg-emerald-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 12000,
      latency_ms: 6,
      storage_gb: 1000,
      replication_mode: "async",
    },
  },
  {
    type: "cassandra",
    name: "Cassandra",
    category: "database",
    description: "Distributed masterless wide-column store for massive write scale.",
    icon: Database,
    badge: "Wide-Col",
    borderClass: "border-cyan-400/40",
    textClass: "text-cyan-300",
    bgClass: "bg-cyan-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 25000,
      latency_ms: 5,
      storage_gb: 2000,
      partition_count: 8,
    },
  },

  // CACHE
  {
    type: "redis",
    name: "Redis",
    category: "cache",
    description: "In-memory key-value data structure store & LRU cache.",
    icon: Zap,
    badge: "In-Memory",
    borderClass: "border-rose-500/40",
    textClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 40000,
      latency_ms: 1,
      memory_gb: 32,
      cache_policy: "LRU",
      cache_ttl_sec: 3600,
    },
  },
  {
    type: "memcached",
    name: "Memcached",
    category: "cache",
    description: "Multithreaded distributed memory object caching system.",
    icon: Zap,
    badge: "Cache",
    borderClass: "border-pink-500/40",
    textClass: "text-pink-400",
    bgClass: "bg-pink-500/10",
    defaultConfig: {
      replicas: 2,
      qps_capacity: 50000,
      latency_ms: 1,
      memory_gb: 64,
      cache_policy: "LRU",
    },
  },

  // MESSAGING
  {
    type: "kafka",
    name: "Kafka",
    category: "messaging",
    description: "Distributed partitioned append-only event streaming log.",
    icon: Radio,
    badge: "Stream",
    borderClass: "border-amber-400/40",
    textClass: "text-amber-300",
    bgClass: "bg-amber-500/10",
    defaultConfig: {
      replicas: 3,
      qps_capacity: 30000,
      latency_ms: 3,
      storage_gb: 500,
      partition_count: 12,
    },
  },
  {
    type: "rabbitmq",
    name: "RabbitMQ",
    category: "messaging",
    description: "AMQP message broker with exchange routing & acknowledgements.",
    icon: Radio,
    badge: "Broker",
    borderClass: "border-orange-500/40",
    textClass: "text-orange-400",
    bgClass: "bg-orange-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 12000, latency_ms: 4 },
  },

  // STORAGE
  {
    type: "object_storage",
    name: "Object Storage",
    category: "storage",
    description: "S3-compatible immutable object store for video, audio & blobs.",
    icon: HardDrive,
    badge: "Blob",
    borderClass: "border-sky-400/40",
    textClass: "text-sky-300",
    bgClass: "bg-sky-500/10",
    defaultConfig: { replicas: 3, qps_capacity: 15000, latency_ms: 30, storage_gb: 50000 },
  },
  {
    type: "block_storage",
    name: "Block Storage",
    category: "storage",
    description: "Low-latency network attached block storage (EBS) for volumes.",
    icon: HardDrive,
    badge: "Block",
    borderClass: "border-slate-400/40",
    textClass: "text-slate-300",
    bgClass: "bg-slate-500/10",
    defaultConfig: { replicas: 2, qps_capacity: 20000, latency_ms: 3, storage_gb: 1000 },
  },
];

export const CATEGORY_LABELS = [
  { key: "all", label: "ALL" },
  { key: "networking", label: "NETWORKING" },
  { key: "compute", label: "COMPUTE" },
  { key: "database", label: "DATABASE" },
  { key: "cache", label: "CACHE" },
  { key: "messaging", label: "MESSAGING" },
  { key: "storage", label: "STORAGE" },
];

// ============================================================================
// INITIAL PROBLEM GRAPH PRESETS
// ============================================================================

export const INITIAL_YOUTUBE_GRAPH: ArchitectureGraph = {
  metadata: {
    problemId: "youtube",
    title: "Design YouTube",
    targetRps: "50K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Video Viewers",
      category: "networking",
      position: { x: 80, y: 220 },
      config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
    },
    {
      id: "api_gateway-1",
      type: "api_gateway",
      name: "API Gateway",
      category: "networking",
      position: { x: 380, y: 220 },
      config: { replicas: 3, qps_capacity: 30000, latency_ms: 2 },
    },
    {
      id: "load_balancer-1",
      type: "load_balancer",
      name: "Load Balancer",
      category: "networking",
      position: { x: 680, y: 220 },
      config: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
    },
    {
      id: "server-1",
      type: "server",
      name: "App Streaming Cluster",
      category: "compute",
      position: { x: 980, y: 220 },
      config: { replicas: 6, qps_capacity: 15000, latency_ms: 6, memory_gb: 32 },
    },
    {
      id: "redis-1",
      type: "redis",
      name: "Metadata Cache",
      category: "cache",
      position: { x: 1320, y: 100 },
      config: { replicas: 3, qps_capacity: 50000, latency_ms: 1, memory_gb: 64, cache_policy: "LRU" },
    },
    {
      id: "postgresql-1",
      type: "postgresql",
      name: "Metadata DB",
      category: "database",
      position: { x: 1320, y: 340 },
      config: { replicas: 2, qps_capacity: 8000, latency_ms: 12, storage_gb: 1000 },
    },
  ],
  edges: [
    { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
    { id: "e-gw-lb", source: "api_gateway-1", target: "load_balancer-1", connectionType: "sync" },
    { id: "e-lb-srv", source: "load_balancer-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-redis", source: "server-1", target: "redis-1", connectionType: "read_path" },
    { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "write_path" },
  ],
};

export const STARTER_TEMPLATES: Record<string, ArchitectureGraph> = {
  three_tier: {
    metadata: {
      problemId: "three_tier",
      title: "3-Tier Web Architecture",
      targetRps: "20K RPS",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: [
      {
        id: "client-1",
        type: "client",
        name: "Web / Mobile Users",
        category: "networking",
        position: { x: 80, y: 220 },
        config: { replicas: 1, qps_capacity: 30000, latency_ms: 1 },
      },
      {
        id: "load_balancer-1",
        type: "load_balancer",
        name: "Application Load Balancer",
        category: "networking",
        position: { x: 420, y: 220 },
        config: { replicas: 2, qps_capacity: 35000, latency_ms: 2 },
      },
      {
        id: "server-1",
        type: "server",
        name: "Backend API Fleet",
        category: "compute",
        position: { x: 780, y: 220 },
        config: { replicas: 4, qps_capacity: 15000, latency_ms: 8, memory_gb: 16 },
      },
      {
        id: "postgresql-1",
        type: "postgresql",
        name: "Primary Database",
        category: "database",
        position: { x: 1140, y: 220 },
        config: { replicas: 2, qps_capacity: 10000, latency_ms: 10, storage_gb: 500, read_capacity: 7000, write_capacity: 3000 },
      },
    ],
    edges: [
      { id: "e-c-lb", source: "client-1", target: "load_balancer-1", connectionType: "sync" },
      { id: "e-lb-srv", source: "load_balancer-1", target: "server-1", connectionType: "sync" },
      { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "write_path" },
    ],
  },
  cache_aside: {
    metadata: {
      problemId: "cache_aside",
      title: "Cache-Aside Architecture",
      targetRps: "40K RPS",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: [
      {
        id: "client-1",
        type: "client",
        name: "Web Clients",
        category: "networking",
        position: { x: 80, y: 220 },
        config: { replicas: 1, qps_capacity: 40000, latency_ms: 1 },
      },
      {
        id: "api_gateway-1",
        type: "api_gateway",
        name: "API Gateway",
        category: "networking",
        position: { x: 400, y: 220 },
        config: { replicas: 2, qps_capacity: 40000, latency_ms: 2 },
      },
      {
        id: "server-1",
        type: "server",
        name: "Core Service",
        category: "compute",
        position: { x: 740, y: 220 },
        config: { replicas: 4, qps_capacity: 20000, latency_ms: 5, memory_gb: 32 },
      },
      {
        id: "redis-1",
        type: "redis",
        name: "Redis Cache",
        category: "cache",
        position: { x: 1100, y: 120 },
        config: { replicas: 2, qps_capacity: 50000, latency_ms: 1, memory_gb: 32, cache_policy: "LRU" },
      },
      {
        id: "postgresql-1",
        type: "postgresql",
        name: "Database Storage",
        category: "database",
        position: { x: 1100, y: 320 },
        config: { replicas: 2, qps_capacity: 10000, latency_ms: 12, storage_gb: 1000, read_capacity: 6000, write_capacity: 4000 },
      },
    ],
    edges: [
      { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
      { id: "e-gw-srv", source: "api_gateway-1", target: "server-1", connectionType: "sync" },
      { id: "e-srv-cache", source: "server-1", target: "redis-1", connectionType: "read_path" },
      { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "write_path" },
    ],
  },
  event_driven: {
    metadata: {
      problemId: "event_driven",
      title: "Event-Driven Pipeline",
      targetRps: "30K RPS",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    nodes: [
      {
        id: "client-1",
        type: "client",
        name: "Ingestion Traffic",
        category: "networking",
        position: { x: 80, y: 220 },
        config: { replicas: 1, qps_capacity: 35000, latency_ms: 1 },
      },
      {
        id: "server-1",
        type: "server",
        name: "Producer Ingress",
        category: "compute",
        position: { x: 400, y: 220 },
        config: { replicas: 3, qps_capacity: 25000, latency_ms: 4 },
      },
      {
        id: "kafka-1",
        type: "kafka",
        name: "Kafka Event Stream",
        category: "messaging",
        position: { x: 740, y: 220 },
        config: { replicas: 3, qps_capacity: 40000, latency_ms: 3, partition_count: 12 },
      },
      {
        id: "server-2",
        type: "server",
        name: "Async Consumer Workers",
        category: "compute",
        position: { x: 1080, y: 220 },
        config: { replicas: 4, qps_capacity: 15000, latency_ms: 10 },
      },
      {
        id: "postgresql-1",
        type: "postgresql",
        name: "Event Log Store",
        category: "database",
        position: { x: 1420, y: 220 },
        config: { replicas: 2, qps_capacity: 12000, latency_ms: 10, storage_gb: 2000 },
      },
    ],
    edges: [
      { id: "e-c-srv", source: "client-1", target: "server-1", connectionType: "sync" },
      { id: "e-srv-kafka", source: "server-1", target: "kafka-1", connectionType: "async" },
      { id: "e-kafka-worker", source: "kafka-1", target: "server-2", connectionType: "async" },
      { id: "e-worker-db", source: "server-2", target: "postgresql-1", connectionType: "write_path" },
    ],
  },
};

// ============================================================================
// TOPIC-SPECIFIC ARCHITECTURE TOPOLOGIES (CURRICULUM HANDOFF)
// ============================================================================

export const CACHE_ASIDE_TOPOLOGY: ArchitectureGraph = {
  metadata: {
    problemId: "distributed-cache-redis",
    title: "Cache-Aside Architecture (Redis)",
    targetRps: "50K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Client Ingress",
      category: "networking",
      position: { x: 80, y: 220 },
      config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
    },
    {
      id: "api_gateway-1",
      type: "api_gateway",
      name: "API Gateway",
      category: "networking",
      position: { x: 380, y: 220 },
      config: { replicas: 3, qps_capacity: 45000, latency_ms: 2 },
    },
    {
      id: "server-1",
      type: "server",
      name: "Application Service",
      category: "compute",
      position: { x: 700, y: 220 },
      config: { replicas: 4, qps_capacity: 30000, latency_ms: 6, memory_gb: 32 },
    },
    {
      id: "redis-1",
      type: "redis",
      name: "Redis Cache Cluster",
      category: "cache",
      position: { x: 1060, y: 120 },
      config: { replicas: 3, qps_capacity: 60000, latency_ms: 1, memory_gb: 64, cache_policy: "LRU" },
    },
    {
      id: "postgresql-1",
      type: "postgresql",
      name: "PostgreSQL Database",
      category: "database",
      position: { x: 1060, y: 320 },
      config: { replicas: 2, qps_capacity: 10000, latency_ms: 12, storage_gb: 1000, read_capacity: 6000, write_capacity: 4000 },
    },
  ],
  edges: [
    { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
    { id: "e-gw-srv", source: "api_gateway-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-redis", source: "server-1", target: "redis-1", connectionType: "read_path", label: "Cache Read" },
    { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "write_path", label: "Cache Miss / Write" },
  ],
};

export const SHARDING_TOPOLOGY: ArchitectureGraph = {
  metadata: {
    problemId: "consistent-hashing-sharding",
    title: "Consistent Hashing & Database Sharding",
    targetRps: "75K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Client Ingress",
      category: "networking",
      position: { x: 80, y: 240 },
      config: { replicas: 1, qps_capacity: 75000, latency_ms: 1 },
    },
    {
      id: "server-1",
      type: "server",
      name: "Sharding Router Fleet",
      category: "compute",
      position: { x: 400, y: 240 },
      config: { replicas: 4, qps_capacity: 70000, latency_ms: 3, memory_gb: 16 },
    },
    {
      id: "postgresql-shard-0",
      type: "postgresql",
      name: "DB Shard 0 (Keys A-H)",
      category: "database",
      position: { x: 820, y: 80 },
      config: { replicas: 2, qps_capacity: 25000, latency_ms: 8, storage_gb: 2000 },
    },
    {
      id: "postgresql-shard-1",
      type: "postgresql",
      name: "DB Shard 1 (Keys I-P)",
      category: "database",
      position: { x: 820, y: 240 },
      config: { replicas: 2, qps_capacity: 25000, latency_ms: 8, storage_gb: 2000 },
    },
    {
      id: "postgresql-shard-2",
      type: "postgresql",
      name: "DB Shard 2 (Keys Q-Z)",
      category: "database",
      position: { x: 820, y: 400 },
      config: { replicas: 2, qps_capacity: 25000, latency_ms: 8, storage_gb: 2000 },
    },
  ],
  edges: [
    { id: "e-c-srv", source: "client-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-s0", source: "server-1", target: "postgresql-shard-0", connectionType: "sync", label: "Slot 0-5460" },
    { id: "e-srv-s1", source: "server-1", target: "postgresql-shard-1", connectionType: "sync", label: "Slot 5461-10922" },
    { id: "e-srv-s2", source: "server-1", target: "postgresql-shard-2", connectionType: "sync", label: "Slot 10923-16383" },
  ],
};

export const EVENT_DRIVEN_TOPOLOGY: ArchitectureGraph = {
  metadata: {
    problemId: "kafka-event-streaming",
    title: "Kafka Event-Driven Architecture",
    targetRps: "50K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Event Publishers",
      category: "networking",
      position: { x: 80, y: 220 },
      config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
    },
    {
      id: "server-1",
      type: "server",
      name: "Producer Ingress Service",
      category: "compute",
      position: { x: 380, y: 220 },
      config: { replicas: 4, qps_capacity: 40000, latency_ms: 4 },
    },
    {
      id: "kafka-1",
      type: "kafka",
      name: "Kafka Broker (12 Partitions)",
      category: "messaging",
      position: { x: 700, y: 220 },
      config: { replicas: 3, qps_capacity: 50000, latency_ms: 2, partition_count: 12 },
    },
    {
      id: "worker-1",
      type: "worker",
      name: "Consumer Worker Fleet",
      category: "compute",
      position: { x: 1020, y: 220 },
      config: { replicas: 4, qps_capacity: 30000, latency_ms: 12 },
    },
    {
      id: "postgresql-1",
      type: "postgresql",
      name: "Event Log Store (DB)",
      category: "database",
      position: { x: 1340, y: 220 },
      config: { replicas: 2, qps_capacity: 15000, latency_ms: 10, storage_gb: 3000 },
    },
  ],
  edges: [
    { id: "e-c-srv", source: "client-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-kafka", source: "server-1", target: "kafka-1", connectionType: "async", label: "Publish Events" },
    { id: "e-kafka-worker", source: "kafka-1", target: "worker-1", connectionType: "async", label: "Consume Batch" },
    { id: "e-worker-db", source: "worker-1", target: "postgresql-1", connectionType: "write_path", label: "Persist" },
  ],
};

export const EDGE_ROUTING_TOPOLOGY: ArchitectureGraph = {
  metadata: {
    problemId: "api-gateway-envoy-routing",
    title: "Edge Routing & Envoy Gateway Topology",
    targetRps: "45K RPS",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  nodes: [
    {
      id: "client-1",
      type: "client",
      name: "Edge Clients",
      category: "networking",
      position: { x: 80, y: 240 },
      config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
    },
    {
      id: "api_gateway-1",
      type: "api_gateway",
      name: "Envoy Edge Gateway",
      category: "networking",
      position: { x: 380, y: 240 },
      config: { replicas: 3, qps_capacity: 45000, latency_ms: 2, rate_limit_rps: 30000 },
    },
    {
      id: "microservice-auth",
      type: "microservice",
      name: "Auth Service",
      category: "compute",
      position: { x: 740, y: 90 },
      config: { replicas: 3, qps_capacity: 20000, latency_ms: 4 },
    },
    {
      id: "microservice-users",
      type: "microservice",
      name: "Users Service",
      category: "compute",
      position: { x: 740, y: 240 },
      config: { replicas: 4, qps_capacity: 25000, latency_ms: 5 },
    },
    {
      id: "microservice-orders",
      type: "microservice",
      name: "Orders Service",
      category: "compute",
      position: { x: 740, y: 390 },
      config: { replicas: 3, qps_capacity: 15000, latency_ms: 7 },
    },
  ],
  edges: [
    { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
    { id: "e-gw-auth", source: "api_gateway-1", target: "microservice-auth", connectionType: "sync", label: "/api/v1/auth" },
    { id: "e-gw-users", source: "api_gateway-1", target: "microservice-users", connectionType: "sync", label: "/api/v1/users" },
    { id: "e-gw-orders", source: "api_gateway-1", target: "microservice-orders", connectionType: "sync", label: "/api/v1/orders" },
  ],
};

export const TOPIC_STARTER_TEMPLATES: Record<string, ArchitectureGraph> = {
  "distributed-cache-redis": CACHE_ASIDE_TOPOLOGY,
  "consistent-hashing-sharding": SHARDING_TOPOLOGY,
  "kafka-event-streaming": EVENT_DRIVEN_TOPOLOGY,
  "api-gateway-envoy-routing": EDGE_ROUTING_TOPOLOGY,
  "load-balancing-horizontal-scaling": EDGE_ROUTING_TOPOLOGY,
};

export function getStarterGraphForTopic(slug: string): ArchitectureGraph | null {
  const normalized = slug.toLowerCase().trim();
  if (
    normalized === "distributed-cache-redis" ||
    normalized === "distributed-caching" ||
    normalized === "caching" ||
    normalized === "cache" ||
    normalized === "cache_aside"
  ) {
    return CACHE_ASIDE_TOPOLOGY;
  }
  if (
    normalized === "consistent-hashing-sharding" ||
    normalized === "database-sharding" ||
    normalized === "sharding" ||
    normalized === "consistent-hashing"
  ) {
    return SHARDING_TOPOLOGY;
  }
  if (
    normalized === "kafka-event-streaming" ||
    normalized === "event-streaming" ||
    normalized === "kafka" ||
    normalized === "event_driven"
  ) {
    return EVENT_DRIVEN_TOPOLOGY;
  }
  if (
    normalized === "api-gateway-envoy-routing" ||
    normalized === "load-balancing-horizontal-scaling" ||
    normalized === "networking-routing" ||
    normalized === "scalability" ||
    normalized === "envoy" ||
    normalized === "load-balancing"
  ) {
    return EDGE_ROUTING_TOPOLOGY;
  }
  return null;
}


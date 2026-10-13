import type { GuidedExercise } from "@/types/exercise";
import type { ArchitectureGraph } from "@/types/simulator";
import {
  CACHE_ASIDE_TOPOLOGY,
  SHARDING_TOPOLOGY,
  EVENT_DRIVEN_TOPOLOGY,
} from "@/components/simulator/simulatorConstants";

// ============================================================================
// INITIAL STARTER GRAPHS FOR GUIDED EXERCISES
// ============================================================================

/**
 * Initial un-cached architecture for Distributed Caching exercise.
 * Client -> Gateway -> Service -> PostgreSQL (Direct unshielded DB).
 */
export const CACHE_EXERCISE_INITIAL_GRAPH: ArchitectureGraph = {
  metadata: {
    problemId: "distributed-cache-redis",
    title: "Un-Cached Direct Database Architecture",
    targetRps: "40K RPS",
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
      id: "postgresql-1",
      type: "postgresql",
      name: "PostgreSQL Database",
      category: "database",
      position: { x: 1060, y: 220 },
      config: { replicas: 1, qps_capacity: 8000, latency_ms: 25, storage_gb: 1000 },
    },
  ],
  edges: [
    { id: "e-c-gw", source: "client-1", target: "api_gateway-1", connectionType: "sync" },
    { id: "e-gw-srv", source: "api_gateway-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "sync" },
  ],
};

/**
 * Initial monolithic unsharded architecture for Database Sharding exercise.
 */
export const SHARDING_EXERCISE_INITIAL_GRAPH: ArchitectureGraph = {
  metadata: {
    problemId: "consistent-hashing-sharding",
    title: "Monolithic Database Bottleneck",
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
      name: "Monolithic PostgreSQL DB",
      category: "database",
      position: { x: 820, y: 240 },
      config: { replicas: 1, qps_capacity: 15000, latency_ms: 18, storage_gb: 2000 },
    },
  ],
  edges: [
    { id: "e-c-srv", source: "client-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-s0", source: "server-1", target: "postgresql-shard-0", connectionType: "sync" },
  ],
};

/**
 * Initial synchronous blocking architecture for Kafka Event Streaming exercise.
 */
export const EVENT_EXERCISE_INITIAL_GRAPH: ArchitectureGraph = {
  metadata: {
    problemId: "kafka-event-streaming",
    title: "Synchronous Ingestion Bottleneck",
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
      id: "postgresql-1",
      type: "postgresql",
      name: "Event Log Store (DB)",
      category: "database",
      position: { x: 740, y: 220 },
      config: { replicas: 2, qps_capacity: 15000, latency_ms: 10, storage_gb: 3000 },
    },
  ],
  edges: [
    { id: "e-c-srv", source: "client-1", target: "server-1", connectionType: "sync" },
    { id: "e-srv-db", source: "server-1", target: "postgresql-1", connectionType: "sync" },
  ],
};

// ============================================================================
// GUIDED EXERCISES CATALOG
// ============================================================================

export const GUIDED_EXERCISES: Record<string, GuidedExercise> = {
  "distributed-cache-redis": {
    id: "exercise-distributed-caching",
    slug: "distributed-cache-redis",
    topicSlug: "distributed-caching",
    title: "Implement Cache-Aside with Redis",
    subtitle: "Shield relational databases from read overload and reduce tail latency",
    problemStatement:
      "Your Application Service is querying PostgreSQL directly for all read traffic. Under a 40K RPS flash surge, database connection pools exhaust and query latencies spike to 25ms+. Implement the Cache-Aside pattern using Redis to absorb high-frequency reads and maintain sub-5ms response times.",
    learningObjectives: [
      "Understand the Cache-Aside pattern (Lazy Loading) mechanics.",
      "Isolate the high-frequency read path (Redis) from the authoritative write path (PostgreSQL).",
      "Configure Redis high-availability replicas to eliminate single points of failure.",
      "Verify that offloading 85%+ of read queries shields relational storage IOPS.",
    ],
    initialGraph: CACHE_EXERCISE_INITIAL_GRAPH,
    targetGraph: CACHE_ASIDE_TOPOLOGY,
    tasks: [
      {
        id: "task-add-redis",
        title: "Place Redis Cache Cluster",
        description: "Add an in-memory Redis cache node to store frequently read entity keys.",
        instructions:
          "Open the Component Library (left panel), find 'Redis' under the CACHE category, and place it on the canvas near the Application Service.",
        requiredNodes: [
          {
            type: "redis",
            minCount: 1,
            description: "At least 1 Redis cache node on the canvas",
          },
        ],
        hints: [
          "In-memory key-value data stores deliver sub-millisecond read access by keeping working sets entirely in RAM.",
          "Look under the 'CACHE' category in the left component palette for 'Redis'.",
          "Drag a 'Redis' component onto the canvas and place it between the Application Service and PostgreSQL.",
        ],
      },
      {
        id: "task-connect-read-path",
        title: "Establish Cache Read Path",
        description:
          "Route read requests from the Application Service to Redis using a dedicated 'read_path' connection.",
        instructions:
          "Draw a connection from Application Service to Redis. Click the edge and change its connection type to 'Read Path' in the inspector.",
        requiredEdges: [
          {
            sourceType: "server",
            targetType: "redis",
            connectionType: "read_path",
            description: "Application Service → Redis with Connection Type 'read_path'",
          },
        ],
        hints: [
          "In the cache-aside pattern, the application service always checks the cache first before executing a database query.",
          "Drag a connection from the right handle of Application Service to the left handle of Redis.",
          "Select the edge connecting Application Service to Redis, then click 'Read Path' under Connection Type in the right panel.",
        ],
      },
      {
        id: "task-connect-write-fallback",
        title: "Connect Database Write & Fallback Path",
        description:
          "Ensure the Application Service connects to PostgreSQL with 'write_path' for mutations and cache misses.",
        instructions:
          "Connect Application Service to PostgreSQL. Select the edge and set its Connection Type to 'Write Path'.",
        requiredEdges: [
          {
            sourceType: "server",
            targetType: "postgresql",
            connectionType: "write_path",
            description: "Application Service → PostgreSQL with Connection Type 'write_path'",
          },
        ],
        hints: [
          "When a cache miss occurs or data is mutated, the application must interact directly with persistent relational storage.",
          "Ensure an edge connects Application Service to PostgreSQL with connectionType 'write_path'.",
          "Click the edge between Application Service and PostgreSQL and set Connection Type to 'Write Path'.",
        ],
      },
      {
        id: "task-configure-redis-ha",
        title: "Eliminate Cache SPOF with Redundancy",
        description:
          "Configure Redis with at least 2 replicas to guarantee high availability and prevent cascade stampedes.",
        instructions:
          "Select the Redis node in the canvas. In the right Inspector panel, increase Replicas to at least 2 instances.",
        requiredNodes: [
          {
            type: "redis",
            minCount: 1,
            minReplicas: 2,
            description: "Redis configured with >= 2 replicas for high availability",
          },
        ],
        hints: [
          "A single cache node is a Single Point of Failure (SPOF). If it crashes, all read requests suddenly stampede the database.",
          "Click the Redis node on the canvas to open its configuration inspector.",
          "Increase the 'Replicas' counter to 2 or 3 to enable primary-replica failover.",
        ],
      },
    ],
    completionMessage:
      "Outstanding! You've successfully built a resilient Cache-Aside architecture. High-frequency reads hit Redis with sub-2ms latency, while PostgreSQL handles authoritative writes and cache misses with multi-replica redundancy.",
    commonMistakes: [
      {
        mistake: "Placing Redis behind PostgreSQL instead of beside it.",
        remedy:
          "Cache-aside requires the Application Service to query Redis first, not the database. Redis is a peer, not a database replica.",
      },
      {
        mistake: "Leaving Redis with 1 single replica.",
        remedy:
          "Always deploy at least 2 cache instances (e.g., Redis Sentinel or Cluster) to avoid a complete database outage if one cache pod restarts.",
      },
      {
        mistake: "Connecting Redis via standard sync instead of read_path.",
        remedy:
          "Marking the edge as 'read_path' enables the simulation engine to apply cache hit ratios and offload database IOPS accurately.",
      },
    ],
  },

  "consistent-hashing-sharding": {
    id: "exercise-database-sharding",
    slug: "consistent-hashing-sharding",
    topicSlug: "database-sharding",
    title: "Database Sharding & Consistent Hashing",
    subtitle: "Distribute massive write throughput across multiple database partitions",
    problemStatement:
      "A single monolithic PostgreSQL instance maxes out at 15K write QPS due to lock contention and single-disk IOPS limits. Implement horizontal database sharding across 3 partitions routed by a consistent-hashing service to support 75K RPS.",
    learningObjectives: [
      "Understand horizontal partitioning (sharding) vs vertical scaling.",
      "Implement a routing layer that distributes queries based on partition keys.",
      "Verify multi-partition failover resilience with replica redundancy.",
    ],
    initialGraph: SHARDING_EXERCISE_INITIAL_GRAPH,
    targetGraph: SHARDING_TOPOLOGY,
    tasks: [
      {
        id: "task-add-shards",
        title: "Deploy 3 Database Partitions",
        description: "Add multiple database nodes representing independent physical shards.",
        instructions:
          "Add PostgreSQL database nodes so that at least 3 database instances exist on the canvas (Shard 0, Shard 1, Shard 2).",
        requiredNodes: [
          {
            type: "postgresql",
            minCount: 3,
            description: "At least 3 PostgreSQL database shard instances",
          },
        ],
        hints: [
          "Horizontal scaling distributes write transactions across independent hardware nodes.",
          "Add 2 more PostgreSQL nodes to the canvas from the DATABASE palette.",
          "Ensure you have 3 distinct PostgreSQL nodes, each representing a distinct hash range.",
        ],
      },
      {
        id: "task-connect-sharding-router",
        title: "Connect Sharding Router to All Shards",
        description: "Connect the Sharding Router Service to each of the 3 database shards.",
        instructions:
          "Draw connections from the Sharding Router Service to each of the 3 database nodes.",
        requiredEdges: [
          {
            sourceType: "server",
            targetType: "postgresql",
            minCount: 3,
            description: "Router connects to all 3 database shards",
          },
        ],
        hints: [
          "The routing service evaluates hash(key) % partitions to direct requests to the responsible shard.",
          "Draw an edge from the Sharding Router Service to every database partition on the canvas.",
          "Verify that all 3 PostgreSQL shards receive incoming connections from the Router.",
        ],
      },
      {
        id: "task-shard-redundancy",
        title: "Ensure Partition Failover Redundancy",
        description: "Configure each database shard with at least 2 replicas.",
        instructions:
          "Select each PostgreSQL shard on the canvas and set its Replicas count to at least 2.",
        requiredNodes: [
          {
            type: "postgresql",
            minCount: 3,
            minReplicas: 2,
            description: "All database shards configured with >= 2 replicas",
          },
        ],
        hints: [
          "If an unsharded DB node fails, only a partition of data is affected, but each shard still requires high-availability standby replicas.",
          "Click each PostgreSQL node and raise its replica count to 2.",
          "Ensure every database node has 'replicas' >= 2 in its configuration.",
        ],
      },
    ],
    completionMessage:
      "Mastery achieved! You've successfully designed a horizontally partitioned database architecture. Write throughput is partitioned across shards, preventing single-node lock contention.",
    commonMistakes: [
      {
        mistake: "Connecting shards in series (DB1 -> DB2 -> DB3).",
        remedy: "Shards are parallel partitions; the application router connects directly to each shard independently.",
      },
      {
        mistake: "Ignoring partition replicas.",
        remedy: "Every individual shard must have replica failover, or a single node loss drops 33% of your users.",
      },
    ],
  },

  "kafka-event-streaming": {
    id: "exercise-kafka-event-streaming",
    slug: "kafka-event-streaming",
    topicSlug: "event-streaming",
    title: "Decouple Ingestion with Kafka Event Streaming",
    subtitle: "Eliminate synchronous blocking and absorb flash traffic bursts with an event log",
    problemStatement:
      "Clients are experiencing timeouts because the Producer Service directly writes heavy payloads to the database synchronously. Decouple ingestion by introducing a Kafka message broker and an asynchronous worker fleet to process messages out of band.",
    learningObjectives: [
      "Understand synchronous RPC bottlenecks vs asynchronous message decoupling.",
      "Integrate Kafka partition logs to absorb traffic spikes without backpressure.",
      "Implement consumer worker fleets with asynchronous acknowledgements.",
    ],
    initialGraph: EVENT_EXERCISE_INITIAL_GRAPH,
    targetGraph: EVENT_DRIVEN_TOPOLOGY,
    tasks: [
      {
        id: "task-add-kafka",
        title: "Place Kafka Event Broker",
        description: "Add a Kafka component to act as the durable distributed event stream.",
        instructions:
          "From the MESSAGING section of the component catalog, drag a 'Kafka' component onto the canvas.",
        requiredNodes: [
          {
            type: "kafka",
            minCount: 1,
            description: "At least 1 Kafka broker node on the canvas",
          },
        ],
        hints: [
          "Append-only distributed logs decouple publishers from subscribers in time and space.",
          "Find 'Kafka' under the MESSAGING palette in the left pane.",
          "Drag a Kafka node onto the canvas between the Producer Service and downstream storage.",
        ],
      },
      {
        id: "task-connect-producer-kafka",
        title: "Wire Asynchronous Producer Stream",
        description: "Connect Producer Service to Kafka using an 'Async' connection type.",
        instructions:
          "Connect Producer Service to Kafka. Select the edge and set Connection Type to 'Async'.",
        requiredEdges: [
          {
            sourceType: "server",
            targetType: "kafka",
            connectionType: "async",
            description: "Producer Service → Kafka with Connection Type 'async'",
          },
        ],
        hints: [
          "Publishers emit events to the broker without waiting for downstream database persistence.",
          "Draw a line from Producer Service to Kafka and change the connection type to 'Async'.",
          "Select the edge connecting Producer Service to Kafka, click 'Async Request' in the right inspector.",
        ],
      },
      {
        id: "task-add-worker-fleet",
        title: "Add Asynchronous Consumer Workers",
        description: "Add a Worker component and connect Kafka to the Worker via 'Async'.",
        instructions:
          "Add a 'Worker' from COMPUTE, then connect Kafka to Worker with an 'Async' connection type.",
        requiredNodes: [
          {
            type: "worker",
            minCount: 1,
            description: "At least 1 Worker node on the canvas",
          },
        ],
        requiredEdges: [
          {
            sourceType: "kafka",
            targetType: "worker",
            connectionType: "async",
            description: "Kafka → Worker with Connection Type 'async'",
          },
        ],
        hints: [
          "Workers pull messages from assigned partitions and execute processing concurrently.",
          "Drag a 'Worker' component from COMPUTE and connect Kafka → Worker with connection type 'Async'.",
          "Ensure the edge from Kafka to Worker is set to 'async'.",
        ],
      },
      {
        id: "task-worker-persist-db",
        title: "Persist Processed Events to Database",
        description: "Connect the Worker fleet to PostgreSQL with 'write_path'.",
        instructions:
          "Draw a connection from Worker to PostgreSQL and set Connection Type to 'Write Path'.",
        requiredEdges: [
          {
            sourceType: "worker",
            targetType: "postgresql",
            connectionType: "write_path",
            description: "Worker → PostgreSQL with Connection Type 'write_path'",
          },
        ],
        hints: [
          "Once background processing or transformation finishes, workers persist results to the database.",
          "Connect the Worker node to PostgreSQL using the 'write_path' connection type.",
          "Select the edge connecting Worker to PostgreSQL, set Connection Type to 'Write Path'.",
        ],
      },
    ],
    completionMessage:
      "Brilliant design! Ingestion is now fully decoupled: producers acknowledge client requests in <5ms, while Kafka buffers peak spikes and workers process messages reliably at their own pace.",
    commonMistakes: [
      {
        mistake: "Connecting Client directly to Kafka.",
        remedy: "Public clients shouldn't directly touch message brokers; an API Gateway or Producer Service validates and authenticates first.",
      },
      {
        mistake: "Using synchronous connection between Producer and Kafka.",
        remedy: "Async connections ensure fire-and-forget burst absorption without tying up HTTP threads.",
      },
    ],
  },
};

/**
 * Resolves a guided exercise by lesson slug or topic slug.
 */
export function getExerciseForSlug(slug?: string | null): GuidedExercise | null {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();

  // Exact match
  if (GUIDED_EXERCISES[normalized]) {
    return GUIDED_EXERCISES[normalized];
  }

  // Aliases for caching
  if (
    normalized === "distributed-caching" ||
    normalized === "caching" ||
    normalized === "redis" ||
    normalized === "cache"
  ) {
    return GUIDED_EXERCISES["distributed-cache-redis"];
  }

  // Aliases for sharding
  if (
    normalized === "database-sharding" ||
    normalized === "sharding" ||
    normalized === "consistent-hashing"
  ) {
    return GUIDED_EXERCISES["consistent-hashing-sharding"];
  }

  // Aliases for event streaming
  if (
    normalized === "event-streaming" ||
    normalized === "kafka" ||
    normalized === "events" ||
    normalized === "event-driven-architecture"
  ) {
    return GUIDED_EXERCISES["kafka-event-streaming"];
  }

  return null;
}

export const DISTRIBUTED_CACHE_EXERCISE = GUIDED_EXERCISES["distributed-cache-redis"];
export const DATABASE_SHARDING_EXERCISE = GUIDED_EXERCISES["consistent-hashing-sharding"];
export const EVENT_DRIVEN_EXERCISE = GUIDED_EXERCISES["kafka-event-streaming"];
